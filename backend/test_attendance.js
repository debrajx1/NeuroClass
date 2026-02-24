const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Session = require('./models/Session');
const Event = require('./models/Event');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');

async function testAttendance() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const teacher = await Teacher.findOne({});
        if (!teacher) return console.log("No teacher found");

        console.log("Found teacher:", teacher._id);

        const sessions = await Session.find({ teacher: teacher._id }).sort({ startTime: -1 }).lean();
        console.log("Found sessions:", sessions.length);

        if (!sessions || sessions.length === 0) {
            console.log("No sessions");
            return;
        }

        const sessionIds = sessions.map(s => s._id);

        console.log("Running aggregation...");
        const eventsAgg = await Event.aggregate([
            { $match: { session: { $in: sessionIds }, studentRef: { $ne: null } } },
            { $group: { _id: { session: "$session", student: "$studentRef" } } }
        ]);

        console.log("Events Aggregation returned", eventsAgg.length, "results");

        const sessionAttendanceMap = {};
        eventsAgg.forEach(ev => {
            if (!ev._id || !ev._id.session || !ev._id.student) {
                console.log("WARN: Missing data in aggregation result:", ev);
                return;
            }
            const sid = ev._id.session.toString();
            if (!sessionAttendanceMap[sid]) {
                sessionAttendanceMap[sid] = new Set();
            }
            sessionAttendanceMap[sid].add(ev._id.student.toString());
        });

        console.log("Session mapping built.");

        const allStudents = await Student.find({}).lean();
        console.log("Found students:", allStudents.length);

        const reportsByDate = {};

        sessions.forEach(session => {
            const dateObj = new Date(session.startTime);
            const dateStr = dateObj.toISOString().split('T')[0];

            if (!reportsByDate[dateStr]) {
                reportsByDate[dateStr] = {
                    date: dateStr,
                    sessions: []
                };
            }

            const presentStudentIds = sessionAttendanceMap[session._id.toString()] || new Set();

            const attendanceList = allStudents.map(student => ({
                id: student._id,
                name: student.name,
                rollNumber: student.rollNumber || 'N/A',
                status: presentStudentIds.has(student._id.toString()) ? 'Present' : 'Absent'
            }));

            attendanceList.sort((a, b) => {
                if (a.rollNumber !== 'N/A' && b.rollNumber !== 'N/A') {
                    return a.rollNumber.localeCompare(b.rollNumber);
                }
                return a.name.localeCompare(b.name);
            });

            reportsByDate[dateStr].sessions.push({
                sessionId: session._id,
                className: session.className,
                subject: session.subject || 'General',
                startTime: session.startTime,
                endTime: session.endTime,
                attendance: attendanceList,
                presentCount: presentStudentIds.size,
                totalCount: allStudents.length
            });
        });

        const result = Object.values(reportsByDate).sort((a, b) => new Date(b.date) - new Date(a.date));
        console.log("SUCCESS. First record:", JSON.stringify(result[0], null, 2).substring(0, 300));

    } catch (err) {
        require('fs').writeFileSync('err.json', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    } finally {
        mongoose.disconnect();
    }
}

testAttendance();
