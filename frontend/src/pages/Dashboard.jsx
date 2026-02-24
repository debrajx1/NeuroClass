import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Users, Clock, Target, Smartphone, AlertTriangle, PlayCircle, StopCircle, Download, Camera, Calendar, BookOpen, GraduationCap, Activity, Flame, Settings, FileCheck } from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';
import ClassroomHeatmap from '../components/ClassroomHeatmap';
import Loader from '../components/Loader';
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '../components/Skeleton';

const STATS_COLORS = {
    attentive: '#22c55e',       // Green
    distracted: '#ef4444',      // Red
    phone: '#f59e0b',           // Amber
    sleeping: '#6366f1',        // Indigo
    'using laptop': '#06b6d4',  // Cyan (Productive)
    'reading book': '#14b8a6',  // Teal (Productive)
    'looking away': '#f43f5e',  // Rose (Distracted)
    talking: '#3b82f6'          // Blue
};

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [activeSession, setActiveSession] = useState(null);
    const [summary, setSummary] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [liveEvents, setLiveEvents] = useState([]); // Array to store recent raw events for real-time list
    const [loading, setLoading] = useState(true);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [sessionTimer, setSessionTimer] = useState('00:00:00');

    const [dailySchedule, setDailySchedule] = useState([]);
    const [currentExpectedClass, setCurrentExpectedClass] = useState(null);
    const [isHoliday, setIsHoliday] = useState(false);
    const [isAutoEnabled, setIsAutoEnabled] = useState(true);
    const [isStartingSession, setIsStartingSession] = useState(false);
    const [attendanceStats, setAttendanceStats] = useState({ present: 0, total: 0 });

    // Feature 4: Auto Nudge Tracker
    const consecutiveDistractionsRef = useRef({});

    // Real-time Timer effect
    useEffect(() => {
        let timerInterval;
        if (activeSession && activeSession.status === 'active' && activeSession.startTime) {
            timerInterval = setInterval(() => {
                const diffSec = differenceInSeconds(new Date(), new Date(activeSession.startTime));
                const h = Math.floor(diffSec / 3600).toString().padStart(2, '0');
                const m = Math.floor((diffSec % 3600) / 60).toString().padStart(2, '0');
                const s = (diffSec % 60).toString().padStart(2, '0');
                setSessionTimer(`${h}:${m}:${s}`);
            }, 1000);
        } else {
            setSessionTimer('00:00:00');
        }
        return () => clearInterval(timerInterval);
    }, [activeSession]);

    const fetchAnalytics = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            let session = null;
            try {
                // Fetch schedule and settings
                const scheduleRes = await axios.get('http://localhost:5000/api/analytics/schedule/today', config);
                setDailySchedule(scheduleRes.data.schedule);
                setCurrentExpectedClass(scheduleRes.data.currentClass);
                setIsHoliday(scheduleRes.data.isHoliday);

                const settingsRes = await axios.get('http://localhost:5000/api/analytics/settings', config);
                setIsAutoEnabled(settingsRes.data.isAutoScheduleEnabled);

                // First try to get an active session
                const sessionRes = await axios.get('http://localhost:5000/api/analytics/session/active', config);
                session = sessionRes.data;

                // Load attendance stats for today
                const attendanceRes = await axios.get('http://localhost:5000/api/analytics/attendance/daily', config);
                if (attendanceRes.data.length > 0 && attendanceRes.data[0].sessions.length > 0) {
                    const todaySessions = attendanceRes.data[0].sessions;
                    const latest = todaySessions[0];
                    setAttendanceStats({ present: latest.presentCount, total: latest.totalCount });
                }

            } catch (err) {
                // If no active session, try to get the latest completed one
                try {
                    const latestSessionRes = await axios.get('http://localhost:5000/api/analytics/session/latest', config);
                    const latestSession = latestSessionRes.data;
                    const today = new Date();
                    const sessionDate = new Date(latestSession.startTime);

                    // CRITICAL FIX: Only show it on the dashboard if it happened TODAY
                    if (sessionDate.getDate() === today.getDate() &&
                        sessionDate.getMonth() === today.getMonth() &&
                        sessionDate.getFullYear() === today.getFullYear()) {
                        session = latestSession;
                    } else {
                        // It's from a previous day. Reset to null, don't show it as "today's" stats.
                        session = null;
                    }
                } catch (err2) {
                    // No sessions available at all
                    session = null;
                }
            }

            if (session) {
                setActiveSession(session);
                const sumRes = await axios.get(`http://localhost:5000/api/analytics/summary/${session._id}`, config);
                setSummary(sumRes.data);

                const timeRes = await axios.get(`http://localhost:5000/api/analytics/timeline/${session._id}`, config);
                const formattedTimeline = timeRes.data.map(t => ({
                    time: format(new Date(t.time), 'HH:mm:ss'),
                    attentive: t.attentive,
                    distracted: t.distracted,
                    score: Math.round(t.score)
                }));
                setTimeline(formattedTimeline);
            } else {
                // RESET STATE if no session today
                setActiveSession(null);
                setSummary({
                    engagementScore: 0, totalEvents: 0,
                    breakdown: { attentive: 0, phone: 0, distracted: 0, sleeping: 0 }
                });
                setTimeline([]);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching live analytics', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();

        // Initial polling can still happen less frequently if needed, or removed entirely 
        // in favor of sockets, but keeping a slow 10s poll as a fallback is good practice.
        const interval = setInterval(fetchAnalytics, 10000);

        // Socket.IO Integration
        const socket = io('http://localhost:5000', {
            reconnectionDelayMax: 10000,
            reconnection: true,
            reconnectionAttempts: 10
        });

        if (user && user._id) {
            socket.on('connect', () => {
                console.log('Socket Connected');
                setIsSocketConnected(true);
                socket.emit('joinRoom', user._id);
            });
            socket.on('disconnect', () => {
                console.log('Socket Disconnected');
                setIsSocketConnected(false);
            });

            socket.on('live-events', (data) => {
                console.log('Received live events:', data);
                if (data.events && data.events.length > 0) {
                    // Feature 4: Auto-Nudge Tracker Logic
                    data.events.forEach(ev => {
                        const sId = ev.studentRef ? ev.studentRef._id : ev.anonymousId;
                        const sName = ev.studentRef ? ev.studentRef.name : `Student`;

                        if (['phone', 'sleeping', 'distracted'].includes(ev.state)) {
                            consecutiveDistractionsRef.current[sId] = (consecutiveDistractionsRef.current[sId] || 0) + 1;

                            // Trigger Nudge on 3 consecutive distraction readings
                            if (consecutiveDistractionsRef.current[sId] === 3) {
                                toast.custom((t) => (
                                    <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-red-500/50 p-4 border border-red-100 overflow-hidden relative`}>
                                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0 pt-0.5 text-2xl">🚨</div>
                                            <div className="ml-3 flex-1">
                                                <p className="text-sm font-bold text-red-600 dark:text-red-400">Auto-Nudge Sent!</p>
                                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                    <strong>{sName}</strong> was distracted. A polite digital push to regain focus has been fired.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ), { duration: 5000, position: 'top-right' });
                            }
                        } else if (['attentive', 'using laptop', 'reading book'].includes(ev.state)) {
                            consecutiveDistractionsRef.current[sId] = 0; // Reset streak
                        }
                    });

                    // Add new events to the top of our live feed, keeping max 20
                    setLiveEvents(prev => [...data.events, ...prev].slice(0, 20));
                    // Trigger a chart refresh to update scores
                    fetchAnalytics();
                }
            });
        }

        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, [user]);

    const handleEndSession = async () => {
        if (!activeSession) return;
        if (!window.confirm("Are you sure you want to end this session and turn off the camera?")) return;

        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/analytics/session/${activeSession._id}/end`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAnalytics(); // Refresh to show ended state
            toast.success("Session ended! The AI camera will shut down automatically in a few seconds.");
        } catch (error) {
            console.error("Failed to end session", error);
            toast.error("Failed to end session");
        }
    };

    const handleStartSession = async () => {
        setIsStartingSession(true);
        if (currentExpectedClass) {
            try {
                const token = localStorage.getItem('token');
                await axios.post('http://localhost:5000/api/analytics/session/start-camera', {
                    className: currentExpectedClass.className,
                    subject: currentExpectedClass.subject
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success(`Starting scheduled class: ${currentExpectedClass.subject}!`);
                setTimeout(() => {
                    fetchAnalytics();
                    setIsStartingSession(false);
                }, 3000);
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    toast.error("Session is already active! The scheduler might be running it.");
                } else {
                    toast.error("Failed to start session.");
                }
                setIsStartingSession(false);
            }
        } else {
            navigate('/sessions');
            toast.info("No class scheduled right now. Redirecting to manual override.");
            setIsStartingSession(false);
        }
    };

    const handleExportCSV = () => {
        if (!timeline || timeline.length === 0) {
            toast.error("No data available to export yet.");
            return;
        }

        // Create CSV header
        let csvContent = "Time,Engagement Score (%),Attentive,Distracted\n";

        // Add rows
        timeline.forEach(row => {
            csvContent += `${row.time},${row.score},${row.attentive},${row.distracted}\n`;
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        saveAs(blob, `session_report_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
        toast.success("Report exported successfully!");
    };

    const handleToggleAuto = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put('http://localhost:5000/api/analytics/settings/toggle-schedule', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsAutoEnabled(res.data.isAutoScheduleEnabled);
            toast.success(res.data.message);
        } catch (error) {
            toast.error("Failed to toggle schedule setting");
        }
    };

    const pieData = summary && summary.breakdown ? [
        { name: 'Attentive', value: summary.breakdown.attentive || 0, color: STATS_COLORS.attentive },
        { name: 'Phone', value: summary.breakdown.phone || 0, color: STATS_COLORS.phone },
        { name: 'Distracted', value: summary.breakdown.distracted || 0, color: STATS_COLORS.distracted },
        { name: 'Sleeping', value: summary.breakdown.sleeping || 0, color: STATS_COLORS.sleeping },
        { name: 'Talking', value: summary.breakdown.talking || 0, color: STATS_COLORS.talking },
        { name: 'Using Laptop', value: summary.breakdown['using laptop'] || 0, color: STATS_COLORS['using laptop'] },
        { name: 'Reading Book', value: summary.breakdown['reading book'] || 0, color: STATS_COLORS['reading book'] },
        { name: 'Looking Away', value: summary.breakdown['looking away'] || 0, color: STATS_COLORS['looking away'] },
    ].filter(d => d.value > 0) : []; // Only show non-zero in pie

    // Calculate Class Vibe
    let vibeColor = 'bg-slate-100 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    let vibeText = 'Waiting for Data';
    if (summary && summary.totalEvents > 0) {
        if (summary.engagementScore >= 80) { vibeColor = 'bg-green-100 text-green-700 border-green-200'; vibeText = '🚀 Highly Engaged'; }
        else if (summary.engagementScore >= 60) { vibeColor = 'bg-yellow-100 text-yellow-700 border-yellow-200'; vibeText = '👍 Good Focus'; }
        else { vibeColor = 'bg-red-100 text-red-700 border-red-200'; vibeText = '⚠️ Needs Attention'; }
    }

    // Determine Top Distractor
    let topDistractorName = 'None';
    let topDistractorVal = 0;
    if (summary && summary.totalEvents > 0) {
        const distractors = [
            { name: 'Phone', val: summary.breakdown.phone || 0 },
            { name: 'Sleeping', val: summary.breakdown.sleeping || 0 },
            { name: 'Distracted', val: summary.breakdown.distracted || 0 },
            { name: 'Talking', val: summary.breakdown.talking || 0 },
            { name: 'Looking Away', val: summary.breakdown['looking away'] || 0 },
        ];
        const highest = distractors.reduce((prev, current) => (prev.val > current.val) ? prev : current);
        if (highest.val > 0) {
            topDistractorName = highest.name;
            topDistractorVal = highest.val;
        }
    }

    const StatCard = ({ title, value, icon: Icon, trend, trendColor }) => (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</h3>
                    {trend && (
                        <p className={`text-sm mt-2 font-medium ${trendColor}`}>
                            {trend}
                        </p>
                    )}
                </div>
                <div className="p-3 bg-primary-50 rounded-xl">
                    <Icon className="w-6 h-6 text-primary-600" />
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg"></div>
                        <div className="h-4 w-96 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-lg mt-2"></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 h-48 animate-pulse border border-slate-100 dark:border-slate-800 shadow-sm"></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="col-span-1 lg:col-span-2">
                        <ChartSkeleton />
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 h-full min-h-[400px] animate-pulse border border-slate-100 dark:border-slate-800 shadow-sm"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Class Overview</h1>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                        <div className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100 shadow-sm">
                            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                            {currentExpectedClass ? currentExpectedClass.className : (activeSession?.className || 'B.Tech CSE - 3rd Sem')}
                        </div>
                        <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${isHoliday
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            : currentExpectedClass
                                ? 'bg-purple-50 text-purple-700 border-purple-100'
                                : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}>
                            <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                            {isHoliday ? 'Holiday / Presentation Day' : currentExpectedClass ? `Current: ${currentExpectedClass.subject}` : 'Break / No Class'}
                        </div>
                        <div className="flex items-center px-3 py-1.5 bg-slate-100 text-slate-600 dark:text-slate-300 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 shadow-sm">
                            <Calendar className="w-3.5 h-3.5 mr-1.5" />
                            {format(new Date(), 'EEEE, MMMM do yyyy')}
                        </div>
                        <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${vibeColor}`}>
                            <Activity className="w-3.5 h-3.5 mr-1.5" />
                            {vibeText}
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleExportCSV}
                        disabled={!activeSession}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ${activeSession ? 'bg-white dark:bg-slate-900 text-slate-700 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-950' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </button>

                    {activeSession && activeSession.status === 'active' ? (
                        <>
                            <div className="flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-100 shadow-sm animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                Live Monitoring Active
                            </div>
                            <button
                                onClick={handleEndSession}
                                className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                <StopCircle className="w-4 h-4 mr-2" />
                                End Session
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center px-4 py-2 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 rounded-full text-sm font-semibold border border-slate-200 dark:border-slate-700 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-slate-400 mr-2"></span>
                                Camera Offline
                            </div>
                            <button
                                onClick={handleStartSession}
                                disabled={isStartingSession}
                                className={`flex items-center px-4 py-2 text-white rounded-lg text-sm font-medium transition-all shadow-sm ${isStartingSession ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5'}`}
                            >
                                {isStartingSession ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                ) : (
                                    <PlayCircle className="w-4 h-4 mr-2" />
                                )}
                                {isStartingSession ? 'Starting AI...' : 'Override: Start Manual'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Engagement Score"
                    value={`${summary.engagementScore}%`}
                    icon={Target}
                    trend="+5% from last class"
                    trendColor="text-green-600"
                />
                <StatCard
                    title={activeSession?.status === 'active' ? "Live Session Timer" : "Avg. Attention Time"}
                    value={activeSession?.status === 'active' ? sessionTimer : "1 hour"}
                    icon={Clock}
                    trend={activeSession?.status === 'active' ? "Recording Insights..." : "Optimal"}
                    trendColor="text-green-600"
                />
                <StatCard
                    title="Phone Interventions"
                    value={summary.breakdown.phone || 0}
                    icon={Smartphone}
                    trend="-12% from average"
                    trendColor="text-green-600"
                />
                <StatCard
                    title="Attendance Today"
                    value={`${attendanceStats.present}/${attendanceStats.total}`}
                    icon={FileCheck}
                    trend="Automated AI Record"
                    trendColor="text-blue-600"
                    onClick={() => navigate('/attendance')}
                    className="cursor-pointer hover:border-primary-300 transition-colors"
                />
                <StatCard
                    title="Top Distraction"
                    value={`${topDistractorVal} events`}
                    icon={AlertTriangle}
                    trend={topDistractorName}
                    trendColor="text-amber-500"
                />
            </div>

            {/* Daily Schedule Timeline */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-primary-500" />
                        Today's Automated Schedule
                    </h3>

                    <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                        <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">Master Automation</span>
                        <button
                            onClick={handleToggleAuto}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${isAutoEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-900 transition-transform ${isAutoEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {!isAutoEnabled && !isHoliday && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center">
                        <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
                        <span className="text-sm font-medium text-amber-800">
                            Automation is currently <strong>PAUSED</strong>. Scheduled classes will not start the camera automatically. Start manually if needed.
                        </span>
                    </div>
                )}

                {isHoliday && (
                    <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start sm:items-center shadow-sm">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg mr-3">
                            <Flame className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-indigo-900">Holiday / Special Event Day</h4>
                            <p className="text-xs text-indigo-700 mt-0.5">
                                Automated classes are smartly suspended for today. Enjoy! You can still start sessions manually via Override if required.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-3">
                    {dailySchedule.map((slot, idx) => {
                        const isCurrent = currentExpectedClass && currentExpectedClass.subject === slot.subject;
                        return (
                            <div key={idx} className={`flex flex-col p-3 rounded-xl border ${isCurrent ? 'bg-primary-50 border-primary-200 ring-1 ring-primary-500' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'} min-w-[120px]`}>
                                <span className={`text-xs font-bold ${isCurrent ? 'text-primary-700' : 'text-slate-500 dark:text-slate-400'}`}>{slot.start} - {slot.end}</span>
                                <span className={`text-sm font-semibold mt-1 ${isCurrent ? 'text-primary-900' : 'text-slate-700'}`}>{slot.subject}</span>
                                {isCurrent && (
                                    <div className="mt-2 flex items-center text-xs font-medium text-green-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                                        Live Now
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Engagement Timeline</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={STATS_COLORS.attentive} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={STATS_COLORS.attentive} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} domain={[0, 100]} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="score"
                                    stroke={STATS_COLORS.attentive}
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorScore)"
                                    name="Engagement Score %"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Breakdown Donut */}
                <div className="col-span-1 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Behavior Breakdown</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Distribution of detected states throughout the session.</p>

                    <div className="flex-1 flex items-center justify-center min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        {pieData.map((item) => (
                            <div key={item.name} className="flex items-center">
                                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{item.value} events</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Live Event Feed */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mt-6">
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Heatmap Area */}
                <div className="h-full">
                    <ClassroomHeatmap liveEvents={liveEvents} />
                </div>

                {/* Live Student Feed */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                            <span className="relative flex h-3 w-3 mr-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSocketConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            </span>
                            Live Student Feed
                        </h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${isSocketConnected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {isSocketConnected ? 'AI Connected' : 'AI Offline / Waiting'}
                        </span>
                    </div>

                    {liveEvents.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50 dark:bg-slate-950/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                            <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800 mb-4">
                                <Camera className="w-8 h-8 text-slate-400" />
                            </div>
                            <h4 className="text-slate-800 dark:text-slate-100 font-semibold mb-1">No Live Data Yet</h4>
                            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
                                Click "Start Session" to connect the AI camera and begin tracking student engagement in real-time.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {liveEvents.map((ev, i) => (
                                <div key={i} className="flex items-center p-3 hover:bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors">
                                    {ev.studentRef ? (
                                        <img src={ev.studentRef.imageUrl || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" alt="Student" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold">?</div>
                                    )}

                                    <div className="ml-4 flex-1">
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                                            {ev.studentRef ? ev.studentRef.name : `Anonymous (${ev.anonymousId})`}
                                            {ev.studentRef && <span className="text-xs text-slate-400 font-normal ml-2">Reg No: {ev.studentRef.rollNumber}</span>}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{format(new Date(ev.timestamp), 'HH:mm:ss')}</p>
                                    </div>

                                    <div className="flex items-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize
                                        ${ev.state === 'attentive' ? 'bg-green-100 text-green-700' :
                                                ev.state === 'phone' ? 'bg-amber-100 text-amber-700' :
                                                    ev.state === 'talking' ? 'bg-blue-100 text-blue-700' :
                                                        ev.state === 'using laptop' ? 'bg-cyan-100 text-cyan-700' :
                                                            ev.state === 'reading book' ? 'bg-teal-100 text-teal-700' :
                                                                ev.state === 'sleeping' ? 'bg-indigo-100 text-indigo-700' :
                                                                    ev.state === 'looking away' ? 'bg-rose-100 text-rose-700' :
                                                                        'bg-red-100 text-red-700'}
                                    `}>
                                            {ev.state}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
