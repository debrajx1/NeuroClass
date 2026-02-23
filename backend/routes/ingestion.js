const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Session = require('../models/Session');

const Student = require('../models/Student');

// API Key middleware for AI Module ingestion
const requireApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== (process.env.INGESTION_API_KEY || 'ai-secret-key')) {
        return res.status(401).json({ message: 'Invalid API Key' });
    }
    next();
};

// @desc    Get all students (or filter by class)
// @route   GET /api/ingestion/students/all or /students/:className
// @access  Private (AI Module)
router.get('/students/:className', requireApiKey, async (req, res) => {
    try {
        let students;
        if (req.params.className === 'all') {
            students = await Student.find({});
        } else {
            students = await Student.find({ className: req.params.className });
        }
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Create a new class session
// @route   POST /api/ingestion/session
// @access  Private (AI Module)
router.post('/session', requireApiKey, async (req, res) => {
    const { teacherId, className } = req.body;

    try {
        const session = await Session.create({
            teacher: teacherId,
            className,
            startTime: new Date()
        });

        res.status(201).json({ sessionId: session._id });
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// @desc    Ingest bulk events from AI Module
// @route   POST /api/ingestion/events
// @access  Private (AI Module)
router.post('/events', requireApiKey, async (req, res) => {
    const { sessionId, events } = req.body;

    // events should be an array of objects: { timestamp, anonymousId, state, confidence }
    if (!sessionId || !events || !Array.isArray(events)) {
        return res.status(400).json({ message: 'Invalid payload format' });
    }

    try {
        const eventsToInsert = events.map(ev => ({
            session: sessionId,
            timestamp: ev.timestamp || new Date(),
            anonymousId: ev.anonymousId,
            studentRef: ev.studentRef || null,
            state: ev.state,
            confidence: ev.confidence || 1.0
        }));

        const insertedEvents = await Event.insertMany(eventsToInsert);

        // Populate student names if studentRef exists before emitting
        const populatedEvents = await Event.populate(insertedEvents, {
            path: 'studentRef',
            select: 'name rollNumber imageUrl'
        });

        // Find teacher for this session to emit to the correct room
        const session = await Session.findById(sessionId);
        if (session && req.io) {
            req.io.to(session.teacher.toString()).emit('live-events', {
                sessionId,
                events: populatedEvents
            });
        }

        res.status(201).json({ message: `Ingested ${events.length} events` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// @desc    Get session status for AI Module
// @route   GET /api/ingestion/session/:sessionId/status
// @access  Private (AI Module)
router.get('/session/:sessionId/status', requireApiKey, async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: 'Not found' });
        res.json({ status: session.status });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    End a class session
// @route   PUT /api/ingestion/session/:sessionId/end
// @access  Private (AI Module)
router.put('/session/:sessionId/end', requireApiKey, async (req, res) => {
    try {
        const session = await Session.findByIdAndUpdate(
            req.params.sessionId,
            { endTime: new Date(), status: 'completed' },
            { new: true }
        );
        res.json({ message: 'Session ended', session });
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

module.exports = router;
