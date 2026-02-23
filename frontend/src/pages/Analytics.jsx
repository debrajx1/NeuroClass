import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, BookOpen, Clock, Activity, Download } from 'lucide-react';
import { saveAs } from 'file-saver';

const Analytics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGlobalStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:5000/api/analytics/global-stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(res.data);
            } catch (error) {
                console.error("Failed to fetch global stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchGlobalStats();
    }, []);
    const exportToCSV = () => {
        if (!stats || !stats.weeklyTrend || stats.weeklyTrend.length === 0) return;
        const csvContent = [
            "Day,Attentive %,Distracted %",
            ...stats.weeklyTrend.map(d => `${d.name},${d.attentive},${d.distracted}`)
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        saveAs(blob, "weekly_engagement_report.csv");
    };

    if (loading) return <div className="h-full w-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;

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

                {/* Actionable Insights */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-[380px]">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">AI Insights</h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {stats.insights && stats.insights.length > 0 ? (
                            stats.insights.map((insight, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border ${insight.type === 'success' ? 'bg-green-50 border-green-100' :
                                        insight.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                                            'bg-blue-50 border-blue-100'
                                    }`}>
                                    <h4 className={`font-semibold mb-1 ${insight.type === 'success' ? 'text-green-800' :
                                            insight.type === 'warning' ? 'text-amber-800' :
                                                'text-blue-800'
                                        }`}>{insight.title}</h4>
                                    <p className={`text-sm ${insight.type === 'success' ? 'text-green-700' :
                                            insight.type === 'warning' ? 'text-amber-700' :
                                                'text-blue-700'
                                        }`}>{insight.desc}</p>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                Not enough data gathered to generate personalized insights yet. Conduct more class sessions.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
