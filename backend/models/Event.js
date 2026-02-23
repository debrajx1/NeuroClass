const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true,
    },
    anonymousId: {
        type: String, // String ID tracked during the session by OpenCV
        required: true,
    },
    studentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student', // Reference to actual student if identified
        required: false,
    },
    state: {
        type: String,
        enum: ['attentive', 'distracted', 'phone', 'sleeping', 'talking', 'hand_raised', 'unknown'],
        required: true,
    },
    confidence: {
        type: Number,
        default: 1.0,
    }
});

// Index for fast querying by session and time
eventSchema.index({ session: 1, timestamp: -1 });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
