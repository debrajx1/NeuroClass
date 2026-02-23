const cron = require('node-cron');
const { spawn } = require('child_process');
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
    if (activeProcess) {
        console.log("[Scheduler] Killing active camera process...");
        // This is a naive kill, might require safer handling for windows
        try {
            process.kill(-activeProcess.pid);
        } catch (e) {
            try {
                activeProcess.kill();
            } catch (err) { }
        }
        activeProcess = null;
    }
}

const initScheduler = async () => {
    console.log("[Scheduler] Initialized. Checking schedule every minute...");

    // We need a default teacher to assign auto-sessions to since this is a 
    // single-user demo setup for now.
    const defaultTeacher = await Teacher.findOne();
    if (!defaultTeacher) {
        console.warn("[Scheduler] No teacher found in DB. Cannot auto-create sessions.");
        return;
    }

    // Run string standard cron: every minute
    cron.schedule('* * * * *', async () => {
        // Fetch fresh teacher data every minute to check the toggle status
        const currentTeacherStatus = await Teacher.findById(defaultTeacher._id);
        const isEnabled = currentTeacherStatus ? currentTeacherStatus.isAutoScheduleEnabled : false;

        const expectedClass = getCurrentClass();

        try {
            // Find any currently active session in the database
            const activeSession = await Session.findOne({ status: 'active' });

            // Ignore manual sessions completely. The teacher must end them manually.
            if (activeSession && activeSession.isManual) {
                return;
            }

            if (expectedClass && isEnabled) {
                // WE SHOULD BE IN A CLASS AND AUTOMATION IS ON

                // Calculate the exact start time of this class slot for today
                const now = new Date();
                const [expectedStartHour, expectedStartMin] = expectedClass.start.split(':').map(Number);
                const classStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), expectedStartHour, expectedStartMin, 0, 0);

                if (!activeSession) {
                    // Check if we already created a session for this specific class slot today
                    const existingSessionForSlot = await Session.findOne({
                        teacher: defaultTeacher._id,
                        className: expectedClass.className,
                        subject: expectedClass.subject,
                        startTime: { $gte: classStartTime }
                    });

                    // If a session exists (even if completed manually), we satisfy the auto-schedule for this period. Do NOT restart.
                    if (existingSessionForSlot) {
                        return;
                    }

                    // Start a new session!
                    console.log(`[Scheduler] Time hit for ${expectedClass.subject}! Starting class...`);
                    const newSession = await Session.create({
                        teacher: defaultTeacher._id,
                        className: expectedClass.className,
                        subject: expectedClass.subject,
                        status: 'active'
                    });
                    startCameraProcess(newSession, defaultTeacher._id);
                } else if (activeSession.subject !== expectedClass.subject) {
                    // The schedule moved to the next subject, but the old session is still active!
                    console.log(`[Scheduler] Subject changed from ${activeSession.subject} to ${expectedClass.subject}. Ending old session...`);
                    activeSession.status = 'completed';
                    activeSession.endTime = new Date();
                    await activeSession.save();
                    stopCameraProcess();

                    // Start the new one
                    const newSession = await Session.create({
                        teacher: defaultTeacher._id,
                        className: expectedClass.className,
                        subject: expectedClass.subject,
                        status: 'active'
                    });
                    setTimeout(() => startCameraProcess(newSession, defaultTeacher._id), 2000); // Wait 2s before restarting camera
                }
                // Else: The correct session is already active. Do nothing.
            } else {
                // WE SHOULD NOT BE IN A CLASS (e.g. Lunch break, after hours, weekend, or Toggle is OFF)
                if (activeSession) {
                    console.log(`[Scheduler] Automation turned off or class ended for ${activeSession.subject}. Closing session...`);
                    activeSession.status = 'completed';
                    activeSession.endTime = new Date();
                    await activeSession.save();
                    stopCameraProcess();
                }
            }
        } catch (error) {
            console.error("[Scheduler] Error during schedule check:", error);
        }
    });
};

module.exports = { initScheduler, DAILY_SCHEDULE, getCurrentClass };
