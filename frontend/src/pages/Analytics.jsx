import api from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, BookOpen, Clock, Activity, Download, Send, Bot, User as UserIcon, MessageSquare, Sparkles } from 'lucide-react';
import { saveAs } from 'file-saver';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Loader from '../components/Loader';
import { CardSkeleton, ChartSkeleton } from '../components/Skeleton';

const Analytics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [aiConsulting, setAiConsulting] = useState(false);
    const [inputMessage, setInputMessage] = useState('');
    const [messages, setMessages] = useState([]);

    console.log("[Analytics] Render State:", { hasStats: !!stats, messagesCount: messages?.length, aiConsulting });
    const chatEndRef = React.useRef(null);

    const scrollToBottom = () => {
        try {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        } catch (err) {
            console.warn("Scroll to bottom failed", err);
        }
    };

    useEffect(() => {
        if (messages?.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    useEffect(() => {
        const fetchGlobalStats = async () => {
            try {
                const res = await api.get('/api/analytics/global-stats');
                setStats(res.data);
            } catch (error) {
                console.error("Failed to fetch global stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchGlobalStats();
    }, []);


    const handleConsultAI = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        console.log("[Analytics] handleConsultAI triggered", { aiConsulting, hasStats: !!stats });

        const query = inputMessage.trim();
        const messageToSend = query || "Please provide an overall pedagogical analysis of my recent class data.";

        if (!stats) {
            console.warn("[Analytics] Cannot consult AI: Stats are missing");
            return;
        }

        if (aiConsulting) {
            console.log("[Analytics] Consultation already in progress, ignoring click");
            return;
        }

        setAiConsulting(true);
        const newUserMsg = { role: 'user', content: messageToSend };
        setMessages(prev => [...(prev || []), newUserMsg]);
        setInputMessage('');

        try {
            console.log("[Analytics] Dispatching AI Chat Request...", { messageToSend });

            const res = await api.post('/api/analytics/ai-chat', {
                message: messageToSend,
                stats,
                history: (messages || []).map(m => ({ role: String(m?.role || ''), content: String(m?.content || '') }))
            });

            console.log("[Analytics] AI Response Received:", res.data);

            if (res.data && res.data.response) {
                setMessages(prev => [...(prev || []), { role: 'ai', content: String(res.data.response) }]);
            } else {
                throw new Error("Invalid response keys from AI");
            }
        } catch (error) {
            console.error("[Analytics] AI Consultation Failed:", error);
            setMessages(prev => [...(prev || []), { role: 'ai', content: 'Chatbot encountered an error. Please check your connection.' }]);
        } finally {
            setAiConsulting(false);
            console.log("[Analytics] Consultation finished");
        }
    };
    const exportToCSV = () => {
        if (!stats || !stats.weeklyTrend || stats.weeklyTrend.length === 0) return;
        const csvContent = [
            "Day,Attentive %,Distracted %",
            ...stats.weeklyTrend.map(d => `${d.name},${d.attentive},${d.distracted}`)
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        saveAs(blob, "weekly_engagement_report.csv");
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg"></div>
                        <div className="h-4 w-48 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-lg"></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ChartSkeleton />
                    <div className="bg-white dark:bg-slate-900 rounded-3xl h-[550px] shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (!stats) return <div className="h-full w-full flex items-center justify-center text-slate-500 dark:text-slate-400">Failed to load analytics.</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Advanced Analytics</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Aggregate insights across all your classes and time periods.</p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="flex items-center px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:bg-slate-950 transition-colors shadow-sm"
                >
                    <Download className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
                    Export CSV Report
                </button>
            </div>

            {/* Aggregate Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Classes Analyzed', value: stats.totalClassesAnalyzed, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Overall Engagement', value: `${stats.overallEngagement}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Total Students Tracked', value: stats.totalStudentsTracked, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Top Distraction', value: stats.topDistraction, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${stat.bg}`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Weekly Trend Chart */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Engagement Trends (Past 7 Days)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Bar dataKey="attentive" name="Attentive %" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="distracted" name="Distracted %" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Chatbot Consultant Container */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col h-[550px] overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-50/30 dark:bg-indigo-900/10">
                        <div className="flex items-center">
                            <div className="p-2 bg-indigo-600 rounded-lg mr-3">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">AI Pedagogical Consultant</h3>
                                <p className="text-[10px] uppercase font-black text-indigo-500 tracking-wider">Experimental Chat v2</p>
                            </div>
                        </div>
                        <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
                        {(messages || []).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300">Start Your Consultation</h4>
                                    <p className="text-xs text-slate-500 max-w-[240px] mt-1">Chat with AI to get data-driven advice on how to improve your class focus.</p>
                                </div>
                                <button
                                    onClick={(e) => handleConsultAI(e)}
                                    disabled={aiConsulting}
                                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {aiConsulting ? 'Consulting...' : 'Generate Daily Insight'}
                                </button>
                            </div>
                        ) : (
                            (messages || []).map((msg, idx) => {
                                if (!msg) return null;
                                return (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] flex space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-800 text-white'}`}>
                                                {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                            </div>
                                            <div className={`p-4 rounded-2xl shadow-sm border ${msg.role === 'user'
                                                ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none'
                                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800 rounded-tl-none'
                                                }`}>
                                                <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                                            li: ({ children }) => <li className="mb-1">{children}</li>,
                                                            h3: ({ children }) => <h3 className="font-bold text-indigo-500 mb-2 mt-3">{children}</h3>,
                                                            strong: ({ children }) => <strong className="font-bold text-indigo-500">{children}</strong>
                                                        }}
                                                    >
                                                        {typeof msg.content === 'string' ? msg.content : String(msg.content || '')}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {aiConsulting && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl rounded-tl-none flex space-x-2">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
                                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-200"></div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleConsultAI} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Consult the AI about your class..."
                                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-4 pl-5 pr-14 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                disabled={aiConsulting}
                            />
                            <button
                                type="submit"
                                disabled={aiConsulting || !inputMessage.trim()}
                                className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-[10px] text-center text-slate-400 mt-2 font-bold uppercase tracking-widest">Powered by NeuroCore Intelligence v2</p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
