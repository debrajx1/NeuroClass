const { spawn, exec } = require('child_process');
const cron = require('node-cron');
const path = require('path');
const Session = require('../models/Session');
const Teacher = require('../models/Teacher');
const { isHoliday } = require('./holidays');

// The strict daily timetable for B.Tech CSE - 3rd Sem
const DAILY_SCHEDULE = [
    { start: '09:00', end: '10:00', subject: 'DS', className: 'B.Tech CSE - 3rd Sem' },
    { start: '10:00', end: '11:00', subject: 'ECA', className: 'B.Tech CSE - 3rd Sem' },
    { start: '11:00', end: '12:00', subject: 'MATHEMATICS III', className: 'B.Tech CSE - 3rd Sem' },
    { start: '12:00', end: '13:00', subject: 'ADEC', className: 'B.Tech CSE - 3rd Sem' },
    // 13:00 - 14:00 is LUNCH BREAK
    { start: '14:00', end: '15:00', subject: 'EE', className: 'B.Tech CSE - 3rd Sem' },
    { start: '15:00', end: '16:00', subject: 'PIOT', className: 'B.Tech CSE - 3rd Sem' },
];

let activeProcess = null;

// Helper to check if current time falls within a class slot
const getCurrentClass = () => {
    const now = new Date();

    // Check for Weekend (0 = Sunday, 6 = Saturday)
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return null; // No classes on weekends
    }

    // Check for College Holidays
    if (isHoliday(now)) {
        return null; // No classes on predefined holidays or techfest days
    }

    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMinute}`;

    return DAILY_SCHEDULE.find(slot => currentTimeStr >= slot.start && currentTimeStr < slot.end);
};

const startCameraProcess = (session, teacherId) => {
    if (activeProcess) {
        console.log("[Scheduler] Camera process already running.");
        return;
    }

    const scriptPath = path.join(__dirname, '../../ai_module/main.py');
    const aiModuleDir = path.join(__dirname, '../../ai_module');

    console.log(`[Scheduler] Spawning AI camera for Session: ${session._id} (${session.subject})`);

    activeProcess = spawn('python', [scriptPath], {
        cwd: aiModuleDir,
        detached: true,
        stdio: 'ignore',
        env: {
            ...process.env,
            TEACHER_ID: teacherId.toString(),
            SESSION_ID: session._id.toString(),
            CLASS_NAME: session.className
        }
    });

    activeProcess.unref();

    activeProcess.on('exit', () => {
        console.log("[Scheduler] AI Camera process exited.");
        activeProcess = null;
    });
};

const stopCameraProcess = () => {
    console.log("[Scheduler] Ensuring AI camera process is terminated...");
    try {
        // Use taskkill /F to force-kill all python processes on Windows.
        // This is much more reliable for the camera lock issue.
        exec('taskkill /F /IM python.exe /T', (err) => {
            if (err) console.log("[Scheduler] No camera process to kill.");
        });
    } catch (e) {
        console.error("[Scheduler] Failed to kill camera process:", e);
    }
    activeProcess = null;
}

const initScheduler = async () => {
    console.log("[Scheduler] Initialized. Checking schedule every minute...");

    cron.schedule('* * * * *', async () => {
        if (process.env.DISABLE_AUTO_SCHEDULER === 'true') {
            return; // Exit silently if master kill switch is ON
        }
        try {
            // Fetch all teachers to check their individual schedules and toggles
            const teachers = await Teacher.find({});

            for (const teacher of teachers) {
                const isEnabled = teacher.isAutoScheduleEnabled;
                const expectedClass = getCurrentClass();

                // Find any currently active session for THIS teacher
                const activeSession = await Session.findOne({
                    teacher: teacher._id,
                    status: 'active'
                });

                // CRITICAL: If the teacher is running a MANUAL session (for testing/demo),
                // the scheduler MUST back off completely and never touch it.
                if (activeSession && activeSession.isManual) {
                    continue; // Check next teacher
                }

                if (isEnabled && expectedClass) {
                    // Calculate expected start time for today
                    const now = new Date();
                    const [h, m] = expectedClass.start.split(':').map(Number);
                    const classStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);

                    if (!activeSession) {
                        // Check if we already created an AUTO session for this teacher/subject today
                        const existingSession = await Session.findOne({
                            teacher: teacher._id,
                            className: expectedClass.className,
                            subject: expectedClass.subject,
                            startTime: { $gte: classStartTime },
                            isManual: { $ne: true }
                        });

                        if (existingSession) continue;

                        console.log(`[Scheduler] Automation starting for ${teacher.email}: ${expectedClass.subject}`);
                        const newSession = await Session.create({
                            teacher: teacher._id,
                            className: expectedClass.className,
                            subject: expectedClass.subject,
                            status: 'active',
                            isManual: false
                        });
                        startCameraProcess(newSession, teacher._id);
                    } else if (activeSession.subject !== expectedClass.subject) {
                        // Subject changed
                        console.log(`[Scheduler] Automation: Subject changed for ${teacher.email}.`);
                        activeSession.status = 'completed';
                        activeSession.endTime = new Date();
                        await activeSession.save();
                        stopCameraProcess();

                        const newSession = await Session.create({
                            teacher: teacher._id,
                            className: expectedClass.className,
                            subject: expectedClass.subject,
                            status: 'active',
                            isManual: false
                        });
                        setTimeout(() => startCameraProcess(newSession, teacher._id), 2000);
                    }
                } else {
                    // Automation is OFF or NO CLASS scheduled.
                    // If an AUTO session is running for this teacher, close it.
                    if (activeSession && !activeSession.isManual) {
                        console.log(`[Scheduler] Automation ending for ${teacher.email}: ${activeSession.subject}`);
                        activeSession.status = 'completed';
                        activeSession.endTime = new Date();
                        await activeSession.save();
                        stopCameraProcess();
                    } else if (activeSession && activeSession.isManual) {
                        // Log that we are staying out of the way of a manual session
                        // console.log(`[Scheduler] Manual session active for ${teacher.email}. Standing by.`);
                    }
                }
            }
        } catch (error) {
            console.error("[Scheduler] Error during schedule check:", error);
        }
    });
};

module.exports = { initScheduler, DAILY_SCHEDULE, getCurrentClass };
