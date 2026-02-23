const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const router = express.Router();
const Event = require('../models/Event');
const Session = require('../models/Session');
const { protect } = require('../middleware/auth');
const { DAILY_SCHEDULE, getCurrentClass } = require('../utils/scheduler');
const { isHoliday } = require('../utils/holidays');

// @desc    Get active session for teacher
// @route   GET /api/analytics/session/active
// @access  Private
router.get('/session/active', protect, async (req, res) => {
    try {
        const activeSession = await Session.findOne({
            teacher: req.teacher._id,
            status: 'active'
        }).sort({ createdAt: -1 });

        if (!activeSession) {
            return res.status(404).json({ message: 'No active session found' });
        }
        res.json(activeSession);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get Global Analytics Stats
// @route   GET /api/analytics/global-stats
// @access  Private
router.get('/global-stats', protect, async (req, res) => {
    try {
        // Find all sessions for the teacher
        const sessions = await Session.find({ teacher: req.teacher._id });
        const totalClasses = sessions.length;

        if (totalClasses === 0) {
            return res.json({
                totalClassesAnalyzed: 0,
                overallEngagement: 0,
                topDistraction: 'None',
                totalStudentsTracked: 0,
                weeklyTrend: [],
                insights: []
            });
        }

        const sessionIds = sessions.map(s => s._id);

        // Get total unique students across all these sessions
        const uniqueAnons = await Event.distinct('anonymousId', { session: { $in: sessionIds } });
        const uniqueIdentified = await Event.distinct('studentRef', { session: { $in: sessionIds }, studentRef: { $ne: null } });
        const totalStudentsTracked = Math.max(uniqueAnons.length, uniqueIdentified.length);

        // Aggregate event stats globally
        const globalEvents = await Event.aggregate([
            { $match: { session: { $in: sessionIds } } },
            {
                $group: {
                    _id: "$state",
                    count: { $sum: 1 }
                }
            }
        ]);

        let stateCounts = { attentive: 0, phone: 0, sleeping: 0, distracted: 0, talking: 0 };
        let totalEvents = 0;

        globalEvents.forEach(ge => {
            stateCounts[ge._id] = ge.count;
            totalEvents += ge.count;
        });

        const overallEngagement = totalEvents > 0
            ? Math.round((stateCounts.attentive / totalEvents) * 100)
            : 0;

        // Find top distraction
        const distractors = [
            { name: 'Phone', count: stateCounts.phone || 0 },
            { name: 'Sleeping', count: stateCounts.sleeping || 0 },
            { name: 'Distraction', count: stateCounts.distracted || 0 },
            { name: 'Talking', count: stateCounts.talking || 0 },
            { name: 'Looking Away', count: stateCounts['looking away'] || 0 },
        ];
        const topDistractor = distractors.reduce((prev, current) => (prev.count > current.count) ? prev : current);

        // Calculate Weekly Trend (Past 7 Days)
        const past7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        // Group sessions by Date
        const trendData = [];
        for (const dateStr of past7Days) {
            const startOfDay = new Date(dateStr);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(dateStr);
            endOfDay.setHours(23, 59, 59, 999);

            const daySessions = sessions.filter(s => s.startTime >= startOfDay && s.startTime <= endOfDay).map(s => s._id);

            if (daySessions.length === 0) {
                trendData.push({
                    name: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
                    attentive: 0,
                    distracted: 0
                });
                continue;
            }

            // Get events for these sessions
            const dayEventsAgg = await Event.aggregate([
                { $match: { session: { $in: daySessions } } },
                {
                    $group: {
                        _id: null,
                        attentiveCount: { $sum: { $cond: [{ $in: ["$state", ["attentive", "using laptop", "reading book"]] }, 1, 0] } },
                        totalCount: { $sum: 1 }
                    }
                }
            ]);

            let attPct = 0;
            let distPct = 0;
            if (dayEventsAgg.length > 0 && dayEventsAgg[0].totalCount > 0) {
                attPct = Math.round((dayEventsAgg[0].attentiveCount / dayEventsAgg[0].totalCount) * 100);
                distPct = 100 - attPct;
            }

            trendData.push({
                name: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
                attentive: attPct,
                distracted: distPct
            });
        }

        // Generate dynamic insights
        const insights = [];
        if (topDistractor.count > 0) {
            insights.push({
                type: 'warning',
                title: `High occurrences of ${topDistractor.name}`,
                desc: `Across all your classes, "${topDistractor.name}" is the most frequent distraction (${topDistractor.count} events). Consider adjusting seating or class rules.`
            });
        }

        if (overallEngagement > 75) {
            insights.push({
                type: 'success',
                title: 'Excellent Overall Engagement',
                desc: `Your classes maintain a strong average engagement score of ${overallEngagement}%. Great job keeping students focused!`
            });
        } else if (totalEvents > 0) {
            insights.push({
                type: 'warning',
                title: 'Engagement Below Target',
                desc: `Your overall average engagement is ${overallEngagement}%. Try introducing more interactive elements to boost participation.`
            });
        }

        res.json({
            totalClassesAnalyzed: totalClasses,
            overallEngagement,
            topDistraction: topDistractor.count > 0 ? topDistractor.name : 'None',
            totalStudentsTracked,
            weeklyTrend: trendData,
            insights
        });

    } catch (error) {
        console.error("Global stats error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get Today's Schedule
// @route   GET /api/analytics/schedule/today
// @access  Private
router.get('/schedule/today', protect, (req, res) => {
    const now = new Date();
    res.json({
        schedule: DAILY_SCHEDULE,
        currentClass: getCurrentClass() || null,
        isHoliday: isHoliday(now)
    });
});

// @desc    Get the single latest completed session
// @route   GET /api/analytics/session/latest
// @access  Private
router.get('/session/latest', protect, async (req, res) => {
    try {
        const latestSession = await Session.findOne({ teacher: req.teacher._id }).sort({ createdAt: -1 });
        if (!latestSession) {
            return res.status(404).json({ message: 'No sessions found' });
        }
        res.json(latestSession);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get dashboard summary statistics
// @route   GET /api/analytics/summary/:sessionId
// @access  Private
router.get('/summary/:sessionId', protect, async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId);
        if (!session || session.teacher.toString() !== req.teacher._id.toString()) {
            return res.status(404).json({ message: 'Session not found or forbidden' });
        }

        const events = await Event.find({ session: session._id });

        // Calculate simple stats
        const totalEvents = events.length;
        const statesCount = {
            attentive: 0,
            phone: 0,
            sleeping: 0,
            distracted: 0,
            talking: 0,
            'using laptop': 0,
            'reading book': 0,
            'looking away': 0
        };

        events.forEach(ev => {
            if (statesCount[ev.state] !== undefined) {
                statesCount[ev.state]++;
            } else {
                statesCount[ev.state] = 1; // Catch any unexpected states
            }
        });

        // Consider laptop and book usage as "attentive/engaged" for the score logic
        const engagedEvents = statesCount.attentive + statesCount['using laptop'] + statesCount['reading book'];
        const engagementScore = totalEvents > 0 ? Math.round((engagedEvents / totalEvents) * 100) : 0;

        res.json({
            engagementScore,
            totalEvents,
            breakdown: statesCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get timeline data for a session
// @route   GET /api/analytics/timeline/:sessionId
// @access  Private
router.get('/timeline/:sessionId', protect, async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId);
        if (!session || session.teacher.toString() !== req.teacher._id.toString()) {
            return res.status(404).json({ message: 'Session not found or forbidden' });
        }

        // Grouping events into 1-minute buckets (simplified)
        const pipeline = [
            { $match: { session: session._id } },
            {
                $group: {
                    _id: {
                        $dateTrunc: {
                            date: "$timestamp",
                            unit: "minute"
                        }
                    },
                    attentiveCount: { $sum: { $cond: [{ $in: ["$state", ["attentive", "using laptop", "reading book"]] }, 1, 0] } },
                    distractedCount: { $sum: { $cond: [{ $in: ["$state", ["phone", "sleeping", "distracted", "looking away"]] }, 1, 0] } },
                    totalCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ];

        const timeline = await Event.aggregate(pipeline);

        const formattedTimeline = timeline.map(t => ({
            time: t._id,
            attentive: t.attentiveCount,
            distracted: t.distractedCount,
            score: t.totalCount > 0 ? (t.attentiveCount / t.totalCount) * 100 : 0
        }));

        res.json(formattedTimeline);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get all sessions for a teacher
// @route   GET /api/analytics/sessions
// @access  Private
router.get('/sessions', protect, async (req, res) => {
    try {
        const sessions = await Session.find({ teacher: req.teacher._id }).sort({ createdAt: -1 }).lean();

        const sessionsWithCounts = await Promise.all(sessions.map(async (session) => {
            const uniqueStudents = await Event.distinct('anonymousId', { session: session._id });
            const uniqueIdentified = await Event.distinct('studentRef', { session: session._id, studentRef: { $ne: null } });

            return {
                ...session,
                studentsCount: Math.max(uniqueStudents.length, uniqueIdentified.length)
            };
        }));

        res.json(sessionsWithCounts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    End a class session from Dashboard
// @route   PUT /api/analytics/session/:sessionId/end
// @access  Private
router.put('/session/:sessionId/end', protect, async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId);
        if (!session || session.teacher.toString() !== req.teacher._id.toString()) {
            return res.status(404).json({ message: 'Session not found or forbidden' });
        }

        session.endTime = new Date();
        session.status = 'completed';
        await session.save();

        res.json({ message: 'Session ended successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Start AI Camera Module
// @route   POST /api/analytics/session/start-camera
// @access  Private
router.post('/session/start-camera', protect, async (req, res) => {
    try {
        // Check if there is already an active session
        const activeSession = await Session.findOne({
            teacher: req.teacher._id,
            status: 'active'
        });

        if (activeSession) {
            return res.status(400).json({ message: 'A session is already active' });
        }

        const { className, subject } = req.body;

        if (!className) {
            return res.status(400).json({ message: 'Class Name is required' });
        }

        // Create the session first
        // NOTE: In automated mode, scheduler usually does this. This is for manual overrides.
        const session = await Session.create({
            teacher: req.teacher._id,
            className,
            subject: subject || '',
            status: 'active',
            isManual: true
        });

        const scriptPath = path.join(__dirname, '../../ai_module/main.py');
        const aiModuleDir = path.join(__dirname, '../../ai_module');

        // Spawn python process in the background, injecting the real teacher ID, class name, and SESSION ID
        const pyProcess = spawn('python', [scriptPath], {
            cwd: aiModuleDir,
            detached: true,
            stdio: 'ignore', // Consider changing to ['ignore', process.stdout, process.stderr] for debugging if needed later
            env: {
                ...process.env,
                TEACHER_ID: req.teacher._id.toString(),
                SESSION_ID: session._id.toString(),
                CLASS_NAME: className
            }
        });

        // Prevent parent from waiting for child to exit
        pyProcess.unref();

        res.json({ message: 'Camera module starting...' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to start camera' });
    }
});

// @desc    Clear ALL sessions and events (Demo Cleanup)
// @route   DELETE /api/analytics/debug/clear
// @access  Private
router.delete('/debug/clear', protect, async (req, res) => {
    try {
        await Session.deleteMany({ teacher: req.teacher._id });
        // NOTE: Strictly deleting events associated with this teacher's sessions requires a lookup, 
        // to simplify cleanup for a standalone demo developer, wiping the Event collection entirely if they are testing:
        await Event.deleteMany({});
        res.json({ message: 'All demo sessions and events cleared successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to clear data' });
    }
});

// @desc    Get Current Settings (Toggle Status)
// @route   GET /api/analytics/settings
// @access  Private
router.get('/settings', protect, async (req, res) => {
    try {
        const teacher = await require('../models/Teacher').findById(req.teacher._id);
        res.json({ isAutoScheduleEnabled: teacher.isAutoScheduleEnabled });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
});

// @desc    Toggle Auto Schedule Status
// @route   PUT /api/analytics/settings/toggle-schedule
// @access  Private
router.put('/settings/toggle-schedule', protect, async (req, res) => {
    try {
        const Teacher = require('../models/Teacher');
        const teacher = await Teacher.findById(req.teacher._id);

        const newStatus = !teacher.isAutoScheduleEnabled;

        await Teacher.findByIdAndUpdate(
            req.teacher._id,
            { isAutoScheduleEnabled: newStatus },
            { new: true } // Return updated doc, no hooks run
        );

        res.json({
            message: `Auto-scheduler turned ${newStatus ? 'ON' : 'OFF'}`,
            isAutoScheduleEnabled: newStatus
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update settings' });
    }
});

module.exports = router;
