import api from '../api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Clock, Smartphone, AlertTriangle, Download, ArrowLeft, Users, Calendar, BookOpen, GraduationCap, Activity, Flame } from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';
import { CardSkeleton, ChartSkeleton } from '../components/Skeleton';

const STATS_COLORS = {
    attentive: '#22c55e',
    distracted: '#ef4444',
    phone: '#f59e0b',
    sleeping: '#6366f1'
};

const Report = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [session, setSession] = useState(location.state?.session || null);
    const [summary, setSummary] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                // If not passed via state, try to fetch from sessions list
                if (!session) {
                    const sessRes = await api.get('/api/analytics/sessions');
                    const found = sessRes.data.find(s => s._id === id);
                    if (found) setSession(found);
                    else {
                        toast.error("Session not found!");
                        navigate('/sessions');
                        return;
                    }
                }

                const sumRes = await api.get(`/api/analytics/summary/${id}`);
                setSummary(sumRes.data);

                const timeRes = await api.get(`/api/analytics/timeline/${id}`);
                const formattedTimeline = timeRes.data.map(t => ({
                    time: format(new Date(t.time), 'HH:mm:ss'),
                    attentive: t.attentive,
                    distracted: t.distracted,
                    score: Math.round(t.score)
                }));
                setTimeline(formattedTimeline);

                setLoading(false);
            } catch (error) {
                console.error('Error fetching report analytics', error);
                toast.error("Failed to load report data.");
                setLoading(false);
            }
        };

        fetchReportData();
    }, [id, session, navigate]);

    const handleExportCSV = () => {
        if (!timeline || timeline.length === 0) {
            toast.error("No data available to export yet.");
            return;
        }

        let csvContent = "Time,Engagement Score (%),Attentive,Distracted\n";
        timeline.forEach(row => {
            csvContent += `${row.time},${row.score},${row.attentive},${row.distracted}\n`;
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        saveAs(blob, `class_report_${session?.subject?.replace(/\s+/g, '_') || 'session'}_${format(new Date(session?.startTime || new Date()), 'yyyy-MM-dd')}.csv`);
        toast.success("Report exported successfully!");
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg"></div>
                        <div className="h-4 w-96 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-lg mt-2"></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <ChartSkeleton />
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 h-full min-h-[400px] animate-pulse border border-slate-100 dark:border-slate-800 shadow-sm"></div>
                </div>
            </div>
        );
    }

    const pieData = summary ? [
        { name: 'Attentive', value: summary.breakdown.attentive || 0, color: STATS_COLORS.attentive },
        { name: 'Phone', value: summary.breakdown.phone || 0, color: STATS_COLORS.phone },
        { name: 'Distracted', value: summary.breakdown.distracted || 0, color: STATS_COLORS.distracted },
        { name: 'Sleeping', value: summary.breakdown.sleeping || 0, color: STATS_COLORS.sleeping },
        { name: 'Talking', value: summary.breakdown.talking || 0, color: '#3b82f6' },
    ].filter(d => d.value > 0) : [];

    let vibeColor = 'bg-slate-100 text-slate-600 border-slate-200';
    let vibeText = 'Waiting for Data';
    if (summary && summary.totalEvents > 0) {
        if (summary.engagementScore >= 80) { vibeColor = 'bg-green-100 text-green-700 border-green-200'; vibeText = '🚀 Highly Engaged'; }
        else if (summary.engagementScore >= 60) { vibeColor = 'bg-yellow-100 text-yellow-700 border-yellow-200'; vibeText = '👍 Good Focus'; }
        else { vibeColor = 'bg-red-100 text-red-700 border-red-200'; vibeText = '⚠️ Needs Attention'; }
    }

    let topDistractorName = 'None';
    let topDistractorVal = 0;
    if (summary && summary.totalEvents > 0) {
        const distractors = [
            { name: 'Phone', val: summary.breakdown.phone || 0 },
            { name: 'Sleeping', val: summary.breakdown.sleeping || 0 },
            { name: 'Distracted', val: summary.breakdown.distracted || 0 },
            { name: 'Talking', val: summary.breakdown.talking || 0 },
        ];
        const highest = distractors.reduce((prev, current) => (prev.val > current.val) ? prev : current);
        if (highest.val > 0) {
            topDistractorName = highest.name;
            topDistractorVal = highest.val;
        }
    }

    const durationSec = differenceInSeconds(new Date(session?.endTime || new Date()), new Date(session?.startTime || new Date()));
    const durationStr = `${Math.floor(durationSec / 3600)}h ${Math.floor((durationSec % 3600) / 60)}m ${durationSec % 60}s`;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 relative">

            <button
                onClick={() => navigate('/sessions')}
                className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-2"
            >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Sessions
            </button>

            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Post-Class Report</h1>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                        <div className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100 shadow-sm">
                            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                            {session?.className || 'Unknown Class'}
                        </div>
                        <div className="flex items-center px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold border border-purple-100 shadow-sm">
                            <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                            {session?.subject || 'Unknown Subject'}
                        </div>
                        <div className="flex items-center px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium border border-slate-200 shadow-sm">
                            <Calendar className="w-3.5 h-3.5 mr-1.5" />
                            {session?.startTime ? format(new Date(session.startTime), 'EEEE, MMMM do yyyy') : 'Unknown Date'}
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
                        className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4 mr-2 text-slate-500" />
                        Export Report
                    </button>
                    <div className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium shadow-sm">
                        Total Students: {session?.studentsCount || 0}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500">Overall Engagement</h3>
                        <div className="p-2 bg-blue-50 rounded-lg"><Activity className="w-5 h-5 text-blue-600" /></div>
                    </div>
                    <div className="flex items-baseline">
                        <h2 className="text-3xl font-bold text-slate-800">{summary?.engagementScore || 0}%</h2>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500">Class Duration</h3>
                        <div className="p-2 bg-green-50 rounded-lg"><Clock className="w-5 h-5 text-green-600" /></div>
                    </div>
                    <div className="flex items-baseline">
                        <h2 className="text-3xl font-bold text-slate-800">{durationStr}</h2>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500">Phone Interventions</h3>
                        <div className="p-2 bg-orange-50 rounded-lg"><Smartphone className="w-5 h-5 text-orange-600" /></div>
                    </div>
                    <div className="flex items-baseline">
                        <h2 className="text-3xl font-bold text-slate-800">{summary?.breakdown?.phone || 0}</h2>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500">Top Distraction</h3>
                        <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 truncate">{topDistractorName}</h2>
                        <span className="text-sm font-medium text-amber-500">{topDistractorVal} events</span>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
                {/* Timeline Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Engagement Timeline</h3>
                    </div>

                    {timeline.length > 0 ? (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} minTickGap={30} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="score" name="Engagement Score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[300px] w-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p className="text-sm text-slate-500">No time-series data available for this session.</p>
                        </div>
                    )}
                </div>

                {/* Pie Chart */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Behavior Breakdown</h3>

                    {pieData.length > 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                            <div className="h-[200px] w-full">
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

                            {/* Custom Legend */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4 w-full px-4">
                                {pieData.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                                            <span className="text-xs font-medium text-slate-600">{item.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-800">{Math.round((item.value / summary.totalEvents) * 100)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 min-h-[300px]">
                            <p className="text-sm text-slate-500">No behavior data recorded.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Report;
