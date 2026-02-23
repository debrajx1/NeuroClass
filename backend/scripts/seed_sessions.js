const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Session = require('../models/Session');
const Event = require('../models/Event');
const Teacher = require('../models/Teacher');

// Load env vars
dotenv.config();

const subjects = [
    "DS",
    "ADEC",
    "ECA",
    "EE",
    "Mathematics III",
    "PIOT"
];

const connectDB = async () => {
    try {
        let uri = process.env.MONGO_URI;
        if (!uri) {
            console.error('MONGO_URI is missing in .env!');
            process.exit(1);
        }
        await mongoose.connect(uri);
        console.log('MongoDB Connected for Seeding');
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

const seedSessions = async () => {
    await connectDB();

    try {
        // Find a teacher to assign sessions to
        const teacher = await Teacher.findOne();
        if (!teacher) {
            console.error("No teacher found in database. Please register a teacher first.");
            process.exit(1);
        }

        console.log(`Seeding for teacher: ${teacher.email}`);

        // Clear all existing data
        console.log('Clearing old sessions and events...');
        await Session.deleteMany({});
        await Event.deleteMany({});
        console.log('Old data cleared.');

        const now = new Date();

        for (let i = 0; i < subjects.length; i++) {
            const subject = subjects[i];

            // Create a session for today, spaced out by a couple of hours
            // Using 9 AM, 11 AM, 1 PM, 3 PM...
            const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9 + i * 2, 0, 0);

            // Class duration between 45 mins to 1.5 hours
            const durationMs = Math.floor(Math.random() * (90 - 45 + 1) + 45) * 60 * 1000;
            const endTime = new Date(startTime.getTime() + durationMs);

            const session = await Session.create({
                teacher: teacher._id,
                className: `B.Tech CSE - 3rd Sem`,
                subject: subject,
                startTime: startTime,
                endTime: endTime,
                status: 'completed'
            });

            console.log(`Created Session: ${subject} (${session._id})`);

            // Generate 30-50 unique students
            const numStudents = Math.floor(Math.random() * 21) + 30;
            const studentIds = Array.from({ length: numStudents }, (_, k) => `student_seed_${session._id}_${k}`);

            // Generate events spanning the duration
            // Let's generate an event every 5 seconds for simulation
            let currentTime = new Date(startTime);
            const eventsToInsert = [];

            while (currentTime < endTime) {
                // Determine general class vibe for this timestamp (mostly attentive, some distracted)

                // For each student, generate an event
                // Only pick a subset of students to report at each tick to simulate frame processing
                const numReportingStudents = Math.floor(Math.random() * (numStudents * 0.8)) + (numStudents * 0.2);

                // Randomly select students
                const reportingStudents = [...studentIds].sort(() => 0.5 - Math.random()).slice(0, numReportingStudents);

                for (const studentId of reportingStudents) {
                    let state = 'attentive';
                    const rand = Math.random();

                    // Probabilities: 70% attentive, 15% distracted, 10% phone, 5% sleeping
                    if (rand > 0.95) state = 'sleeping';
                    else if (rand > 0.85) state = 'phone';
                    else if (rand > 0.70) state = 'distracted';

                    eventsToInsert.push({
                        session: session._id,
                        anonymousId: studentId,
                        state: state,
                        time: new Date(currentTime),
                        createdAt: new Date(currentTime) // Ensure createdAt matches time for proper sorting if needed
                    });
                }

                currentTime = new Date(currentTime.getTime() + 15000); // jump 15 seconds to reduce data volume
            }

            // Insert events in bulk
            await Event.insertMany(eventsToInsert);
            console.log(`Created ${eventsToInsert.length} events for ${subject}`);
        }

        console.log('Seeding Complete!');
        process.exit();

    } catch (error) {
        console.error("Seeding failed", error);
        process.exit(1);
    }
};

seedSessions();
