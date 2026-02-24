const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Teacher = require('./models/Teacher');

const checkTeachers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const teachers = await Teacher.find({});
        console.log('Total Teachers:', teachers.length);
        teachers.forEach(t => {
            console.log(`- ${t.name} (${t.email}), AutoEnabled: ${t.isAutoScheduleEnabled}, ID: ${t._id}`);
        });

        const target = await Teacher.findOne({ email: 'debraj@giet.edu' });
        if (target) {
            console.log('\nFound debraj@giet.edu!');
            console.log('ID:', target._id);
            console.log('AutoEnabled:', target.isAutoScheduleEnabled);

            if (!target.isAutoScheduleEnabled) {
                target.isAutoScheduleEnabled = true;
                await target.save();
                console.log('SUCCESS: isAutoScheduleEnabled set to TRUE');
            }
        } else {
            console.log('\nTeacher debraj@giet.edu NOT FOUND');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

checkTeachers();
