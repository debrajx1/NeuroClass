const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

const connectDB = async () => {
    try {
        let uri = process.env.MONGO_URI;

        if (!uri) {
            console.error('MONGO_URI is missing in .env!');
            process.exit(1);
        }

        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Seed the database with a default user automatically
        const Teacher = require('../models/Teacher');
        const defaultTeacherId = new mongoose.Types.ObjectId('6500acdef1234567890abcde');
        const existingTeacher = await Teacher.findOne({ email: 'debraj@giet.edu' });
        if (!existingTeacher) {
            await Teacher.create({ _id: defaultTeacherId, name: 'Debraj', email: 'debraj@giet.edu', password: 'password123' });
            console.log('Seeded default teacher: debraj@giet.edu / password123');
        }

    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
