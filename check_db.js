const mongoose = require('mongoose');
const Teacher = require('./backend/models/Teacher');
require('dotenv').config({ path: './backend/.env' });

async function checkTeacher() {
    await mongoose.connect(process.env.MONGO_URI);
    const teacher = await Teacher.findOne({ email: 'debraj@giet.edu' });
    if (teacher) {
        console.log('Teacher found:', teacher.email);
        console.log('Name:', teacher.name);
    } else {
        console.log('Teacher NOT found');
    }
    process.exit();
}
checkTeacher().catch(console.error);
