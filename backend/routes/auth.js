const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

// @desc    Auth teacher & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const teacher = await Teacher.findOne({ email });

    if (teacher && (await teacher.matchPassword(password))) {
        res.json({
            _id: teacher._id,
            name: teacher.name,
            email: teacher.email,
            role: teacher.role,
            token: generateToken(teacher._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
});

// @desc    Register a new teacher
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    const teacherExists = await Teacher.findOne({ email });

    if (teacherExists) {
        return res.status(400).json({ message: 'Teacher already exists' });
    }

    const teacher = await Teacher.create({
        name,
        email,
        password,
    });

    if (teacher) {
        res.status(201).json({
            _id: teacher._id,
            name: teacher.name,
            email: teacher.email,
            role: teacher.role,
            token: generateToken(teacher._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid teacher data' });
    }
});

// @desc    Get teacher profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    const teacher = await Teacher.findById(req.teacher._id);

    if (teacher) {
        res.json({
            _id: teacher._id,
            name: teacher.name,
            email: teacher.email,
            role: teacher.role,
        });
    } else {
        res.status(404).json({ message: 'Teacher not found' });
    }
});

module.exports = router;
