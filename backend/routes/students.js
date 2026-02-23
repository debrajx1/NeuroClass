const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Student = require('../models/Student');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

// Configure multer storage to use memory for processing with sharp
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Add a new student (with image upload and compression)
router.post('/', protect, upload.single('image'), async (req, res) => {
    try {
        const { className, name, rollNumber } = req.body;

        let imageUrl = '';
        if (req.file) {
            try {
                // Generate a unique filename
                const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
                const uploadDir = path.join(__dirname, '..', 'uploads');

                // Ensure directory exists
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // Compress and resize using sharp
                await sharp(req.file.buffer)
                    .resize({ width: 500 }) // Optimized size for facial recognition
                    .webp({ quality: 80 })
                    .toFile(path.join(uploadDir, filename));

                // Construct full URL to access the image
                imageUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
            } catch (err) {
                console.error("Image processing error:", err);
                return res.status(500).json({ message: 'Error processing image upload.' });
            }
        } else {
            return res.status(400).json({ message: 'Student photo is required.' });
        }

        const existing = await Student.findOne({ teacherId: req.teacher._id, className, rollNumber });
        if (existing) {
            return res.status(400).json({ message: 'Student with this roll number already exists in this class.' });
        }

        const newStudent = new Student({
            teacherId: req.teacher._id,
            className,
            name,
            rollNumber,
            imageUrl
        });

        await newStudent.save();
        res.status(201).json(newStudent);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all students for a teacher across all classes
router.get('/', protect, async (req, res) => {
    try {
        const students = await Student.find({ teacherId: req.teacher._id });
        res.status(200).json(students);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all students for a specific class
router.get('/:className', protect, async (req, res) => {
    try {
        const students = await Student.find({
            teacherId: req.teacher._id,
            className: req.params.className
        });
        res.status(200).json(students);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update a student
router.put('/:id', protect, upload.single('image'), async (req, res) => {
    try {
        const { className, name, rollNumber } = req.body;
        const studentId = req.params.id;

        const student = await Student.findOne({ _id: studentId, teacherId: req.teacher._id });
        if (!student) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        // Check roll number conflict if it changed
        if (rollNumber !== student.rollNumber || className !== student.className) {
            const existing = await Student.findOne({ teacherId: req.teacher._id, className, rollNumber, _id: { $ne: studentId } });
            if (existing) {
                return res.status(400).json({ message: 'Another student with this roll number already exists in this class.' });
            }
        }

        let imageUrl = student.imageUrl;
        if (req.file) {
            try {
                // Generate a unique filename
                const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
                const uploadDir = path.join(__dirname, '..', 'uploads');

                // Ensure directory exists
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // Compress and resize using sharp
                await sharp(req.file.buffer)
                    .resize({ width: 500 })
                    .webp({ quality: 80 })
                    .toFile(path.join(uploadDir, filename));

                // Optional: Delete old image here if needed

                imageUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
            } catch (err) {
                console.error("Image processing error:", err);
                return res.status(500).json({ message: 'Error processing image upload.' });
            }
        }

        student.name = name || student.name;
        student.className = className || student.className;
        student.rollNumber = rollNumber || student.rollNumber;
        student.imageUrl = imageUrl;

        await student.save();
        res.status(200).json(student);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a student
router.delete('/:id', protect, async (req, res) => {
    try {
        const student = await Student.findOneAndDelete({ _id: req.params.id, teacherId: req.teacher._id });
        if (!student) {
            return res.status(404).json({ message: 'Student not found.' });
        }
        res.status(200).json({ message: 'Student deleted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
