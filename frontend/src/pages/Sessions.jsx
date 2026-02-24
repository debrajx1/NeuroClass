import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { AuthContext } from '../context/AuthContext';
import { Users, Search, Calendar, ChevronRight, Video, BookOpen, Info, X, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { TableSkeleton } from '../components/Skeleton';

const Sessions = () => {
    const { user } = useContext(AuthContext);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newSessionName, setNewSessionName] = useState('');
    const [newSessionSubject, setNewSessionSubject] = useState('');
    const [isStarting, setIsStarting] = useState(false);
    const navigate = useNavigate();
    const hasActiveSession = sessions.some(s => s.status === 'active');

    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get('http://localhost:5000/api/analytics/sessions', config);
            setSessions(res.data);
            setLoading(false);

            // Also fetch schedule to pre-fill the modal just in case
            try {
                const scheduleRes = await axios.get('http://localhost:5000/api/analytics/schedule/today', config);
                if (scheduleRes.data.currentClass) {
                    setNewSessionName(scheduleRes.data.currentClass.className);
                    setNewSessionSubject(scheduleRes.data.currentClass.subject);
                }
            } catch (e) { }
        } catch (error) {
            console.error("Failed to fetch sessions", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 15000); // Polling for updates
        return () => clearInterval(interval);
    }, []);

    const getDuration = (start, end) => {
        if (!start) return '0m';
        const endDate = end ? new Date(end) : new Date();
        const diffSecs = differenceInSeconds(endDate, new Date(start));
        const h = Math.floor(diffSecs / 3600);
        const m = Math.floor((diffSecs % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const handleStartSession = async (e) => {
        e.preventDefault();
        if (hasActiveSession) {
            toast.error("A session is already active!");
            setIsModalOpen(false);
            return;
        }

        setIsStarting(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/analytics/session/start-camera', {
                className: newSessionName,
                subject: newSessionSubject
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Camera is starting! Redirecting to Dashboard...");
            setIsModalOpen(false);
            setNewSessionName('');
            setNewSessionSubject('');

            setTimeout(() => {
                fetchSessions();
                setIsStarting(false);
                navigate('/');
            }, 1000);
        } catch (error) {
            console.error(error);
            toast.error("Failed to start session.");
            setIsStarting(false);
        }
    };

    const filteredSessions = sessions.filter(session =>
        (session.className || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Class Sessions</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and review past classroom recordings and analytics.</p>
                </div>
                <button
                    onClick={() => {
                        if (hasActiveSession) {
                            toast.error("A session is already active! Go to the Dashboard to view it.");
                        } else {
                            setIsModalOpen(true);
                        }
                    }}
                    className={`flex items-center px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors shadow-sm ${hasActiveSession ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
                        }`}
                >
                    <Video className="w-4 h-4 mr-2" />
                    Start New Session
                </button>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
                        {/* Header Area */}
                        <div className="bg-gradient-to-r from-primary-600 to-indigo-700 px-6 py-5 relative">
                            <h2 className="text-xl font-bold text-white flex items-center">
                                <Video className="w-5 h-5 mr-2 opacity-90" />
                                Initialize Session & Dashboard
                            </h2>
                            <p className="text-primary-100 text-sm mt-1">
                                Override system schedule to record an ad-hoc class and monitor live.
                            </p>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex items-start bg-amber-50 rounded-xl p-4 mb-6 border border-amber-100 shadow-sm">
                                <Info className="w-5 h-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                                <div className="text-sm text-amber-800">
                                    <strong className="font-semibold block mb-0.5">Automated Schedule is Active</strong>
                                    The system normally starts sessions based on the college timetable. Starting a manual session gives you immediate control.
                                </div>
                            </div>

                            <form onSubmit={handleStartSession}>
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center">
                                            <Users className="w-4 h-4 mr-1.5 text-slate-400" /> Class Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            autoFocus
                                            value={newSessionName}
                                            onChange={(e) => setNewSessionName(e.target.value)}
                                            placeholder="e.g. B.Tech CSE - 3rd Sem"
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white dark:bg-slate-900 transition-all outline-none font-medium text-slate-900 dark:text-white shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center">
                                            <BookOpen className="w-4 h-4 mr-1.5 text-slate-400" /> Subject (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={newSessionSubject}
                                            onChange={(e) => setNewSessionSubject(e.target.value)}
                                            placeholder="e.g. Machine Learning"
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white dark:bg-slate-900 transition-all outline-none font-medium text-slate-900 dark:text-white shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 pt-5 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isStarting}
                                        className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-sm flex items-center ${isStarting ? 'bg-primary-400 cursor-wait' : 'bg-primary-600 hover:bg-primary-700 hover:shadow-md hover:-translate-y-0.5'}`}
                                    >
                                        {isStarting ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                        ) : (
                                            <Video className="w-4 h-4 mr-2" />
                                        )}
                                        {isStarting ? 'Starting AI...' : 'Start Override'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search sessions by class name..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                        />
                    </div>
                </div>

                {loading ? (
                    <TableSkeleton rows={8} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider">
                                    <th className="p-4 font-semibold">Class Name</th>
                                    <th className="p-4 font-semibold">Date</th>
                                    <th className="p-4 font-semibold">Duration</th>
                                    <th className="p-4 font-semibold">Students</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredSessions.map((session) => (
                                    <tr key={session._id} className="hover:bg-slate-50 dark:bg-slate-950 transition-colors group cursor-pointer">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${session.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600 dark:text-slate-300'}`}>
                                                    <Users className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <span className="font-medium text-slate-900 dark:text-white">
                                                        {session.className || 'Unknown Class'}
                                                        {session.subject && <span className="text-slate-500 dark:text-slate-400 font-normal ml-1.5">({session.subject})</span>}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                {format(new Date(session.startTime), 'MMM dd, yyyy')}
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-500 dark:text-slate-400">{getDuration(session.startTime, session.endTime)}</td>
                                        <td className="p-4 text-slate-500 dark:text-slate-400">{session.studentsCount || 0} Detected</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${session.status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-slate-100 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                                                }`}>
                                                {session.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>}
                                                {session.status === 'active' ? 'Live' : 'Completed'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate('/attendance');
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center transition-colors whitespace-nowrap bg-indigo-50 px-3 py-1.5 rounded-md hover:bg-indigo-100"
                                                >
                                                    <FileText className="w-4 h-4 mr-1" /> Attendance
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/report/${session._id}`, { state: { session } });
                                                    }}
                                                    className="text-primary-600 hover:text-primary-800 font-medium text-sm flex items-center transition-colors whitespace-nowrap bg-primary-50 px-3 py-1.5 rounded-md hover:bg-primary-100"
                                                >
                                                    Report <ChevronRight className="w-4 h-4 ml-1" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sessions;
