const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true,
    },
    className: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
    },
    startTime: {
        type: Date,
        default: Date.now,
    },
    endTime: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['active', 'completed'],
        default: 'active',
    },
    isManual: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;
