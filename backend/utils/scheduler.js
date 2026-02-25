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

const startCameraProcess = async (session, teacherId) => {
    if (activeProcess) {
        console.log("[Scheduler] Camera process already running.");
        return;
    }

    const scriptPath = path.join(__dirname, '../../ai_module/main.py');
    const aiModuleDir = path.join(__dirname, '../../ai_module');
    const pythonPath = path.join(__dirname, '../../.venv/Scripts/python.exe');

    // FORCED CLEANUP: Ensure no other python process is holding the camera.
    const { execSync } = require('child_process');
    try {
        execSync('taskkill /F /IM python.exe /T');
        console.log("[Scheduler] Forced cleanup of existing Python processes.");
    } catch (e) { }

    const pyProcess = spawn(pythonPath, [scriptPath], {
        cwd: aiModuleDir,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: {
            ...process.env,
            TEACHER_ID: teacherId.toString(),
            SESSION_ID: session._id.toString(),
            CLASS_NAME: session.className
        }
    });

    const pid = pyProcess.pid;
    console.log(`[Scheduler] Spawned AI Camera process with PID: ${pid}`);

    // Update session with PID
    try {
        await Session.findByIdAndUpdate(session._id, { pid: pid });
    } catch (err) {
        console.error("[Scheduler] Failed to update session with PID:", err);
    }

    pyProcess.unref();
    activeProcess = pyProcess;

    pyProcess.on('exit', () => {
        console.log(`[Scheduler] AI Camera process ${pid} exited.`);
        if (activeProcess && activeProcess.pid === pid) {
            activeProcess = null;
        }
    });
};

const stopCameraProcess = (pid) => {
    if (!pid) {
        console.log("[Scheduler] No PID provided to stop.");
        return;
    }
    console.log(`[Scheduler] Terminating specific AI camera process (PID: ${pid})...`);
    try {
        // Targeted kill of the specific PID and its children
        exec(`taskkill /F /PID ${pid} /T`, (err) => {
            if (err) console.log(`[Scheduler] Process ${pid} already terminated or access denied.`);
        });
    } catch (e) {
        console.error(`[Scheduler] Failed to kill process ${pid}:`, e);
    }
};

const initScheduler = async () => {
    console.log("[Scheduler] Initialized. Checking schedule every minute...");

    cron.schedule('* * * * *', async () => {
        if (process.env.DISABLE_AUTO_SCHEDULER === 'true') {
            return;
        }
        try {
            const teachers = await Teacher.find({});

            for (const teacher of teachers) {
                const isEnabled = teacher.isAutoScheduleEnabled;
                const expectedClass = getCurrentClass();

                const activeSession = await Session.findOne({
                    teacher: teacher._id,
                    status: 'active'
                });

                // 1. Master Check: If MANUAL session is running, DON'T TOUCH IT.
                if (activeSession && activeSession.isManual) {
                    continue;
                }

                // 2. Automation Logic
                if (isEnabled && expectedClass) {
                    const now = new Date();
                    const [h, m] = expectedClass.start.split(':').map(Number);
                    const classStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);

                    if (!activeSession) {
                        // Start new auto session if none exists today
                        const existingSession = await Session.findOne({
                            teacher: teacher._id,
                            className: expectedClass.className,
                            subject: expectedClass.subject,
                            startTime: { $gte: classStartTime },
                            isManual: { $ne: true }
                        });

                        if (!existingSession) {
                            console.log(`[Scheduler] Starting AUTO session for ${teacher.email}: ${expectedClass.subject}`);
                            const newSession = await Session.create({
                                teacher: teacher._id,
                                className: expectedClass.className,
                                subject: expectedClass.subject,
                                status: 'active',
                                isManual: false
                            });
                            startCameraProcess(newSession, teacher._id);
                        }
                    } else if (activeSession.subject !== expectedClass.subject) {
                        // Subject changed
                        console.log(`[Scheduler] AUTO Subject changed for ${teacher.email}.`);
                        activeSession.status = 'completed';
                        activeSession.endTime = new Date();
                        await activeSession.save();
                        stopCameraProcess(activeSession.pid);

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
                    // Automation is OFF or NO CLASS. Clean up AUTO sessions.
                    if (activeSession && !activeSession.isManual) {
                        console.log(`[Scheduler] AUTO session ending for ${teacher.email}: ${activeSession.subject}`);
                        activeSession.status = 'completed';
                        activeSession.endTime = new Date();
                        await activeSession.save();
                        stopCameraProcess(activeSession.pid);
                    }
                }
            }
        } catch (error) {
            console.error("[Scheduler] Error during schedule check:", error);
        }
    });
};

module.exports = { initScheduler, DAILY_SCHEDULE, getCurrentClass, stopCameraProcess };
