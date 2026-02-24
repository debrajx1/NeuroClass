const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true,
    },
    className: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    rollNumber: {
        type: String,
        required: true,
    },
    imageUrl: {
        type: String,
        required: true,
    },
    faceEncoding: {
        type: [Number], // Array of floats representing the face features
        required: false, // Make it optional initially
    },
    focusCoins: {
        type: Number,
        default: 0
    },
    focusStreak: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Compound index to ensure rollNumber is unique per class
StudentSchema.index({ teacherId: 1, className: 1, rollNumber: 1 }, { unique: true });

module.exports = mongoose.model('Student', StudentSchema);
