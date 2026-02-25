import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
    User, Bell, Shield, Monitor, Moon, Sun, Volume2, RefreshCw, Mail,
    Smartphone, Eye, EyeOff, Brain, Zap, Trophy, Coins, AlertCircle,
    BarChart, Layout, Sparkles, Database, History, DownloadCloud, Trash2
} from 'lucide-react';
import api from '../api';
import axios from 'axios';
import toast from 'react-hot-toast';

const Settings = () => {
    const { user, dispatch } = useContext(AuthContext);

    // UI Local States
    const [theme, setTheme] = useState('light');
    const [soundEnabled, setSoundEnabled] = useState(true);

    // AI Perception States
    const [perceptionLevel, setPerceptionLevel] = useState('Medium');
    const [aiEngine, setAiEngine] = useState('High Performance');
    const [engagementThreshold, setEngagementThreshold] = useState(40);
    const [cameraIndex, setCameraIndex] = useState(0);

    // Toggles State
    const [toggles, setToggles] = useState({
        isAutoScheduleEnabled: false,
        anonymize: false,
        emailAlerts: true,
        pushAlerts: false,
        coinsEnabled: true,
        leaderboardEnabled: true,
        weeklyReport: true
    });

    const [isLoading, setIsLoading] = useState(true);

    // Fetch initial settings from backend
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/api/analytics/settings');
                setToggles(prev => ({ ...prev, isAutoScheduleEnabled: res.data.isAutoScheduleEnabled }));
                setCameraIndex(res.data.cameraIndex || 0);
                setIsLoading(false);
            } catch (error) {
                console.error("Failed to fetch settings", error);
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleToggle = (key) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
        toast.success(`${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} updated.`, {
            icon: '⚙️',
            style: { borderRadius: '12px', background: '#333', color: '#fff' }
        });
    };

    const handleAutoScheduleToggle = async () => {
        try {
            const res = await api.put('/api/analytics/settings/toggle-schedule', {});
            setToggles(prev => ({ ...prev, isAutoScheduleEnabled: res.data.isAutoScheduleEnabled }));
            toast.success(res.data.message);
        } catch (error) {
            toast.error("Failed to update auto-schedule.");
        }
    };

    const handleCameraChange = async (index) => {
        try {
            const res = await api.put('/api/analytics/settings/camera', { cameraIndex: index });
            setCameraIndex(res.data.cameraIndex);
            toast.success(res.data.message, { icon: '📸' });
        } catch (error) {
            toast.error("Failed to update camera source.");
        }
    };

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        const root = document.documentElement;
        if (newTheme === 'dark') root.classList.add('dark');
        else if (newTheme === 'light') root.classList.remove('dark');
        else {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
            else root.classList.remove('dark');
        }
        toast.success(`Theme set to ${newTheme} mode.`);
    };

    const handleClearDemoData = async () => {
        if (!window.confirm("WARNING: This will permanently delete ALL Class Sessions, Timelines, and Event data. Are you sure?")) return;
        try {
            await api.delete('/api/analytics/debug/clear');
            toast.success("Database wiped successfully!", { icon: '🔥' });
        } catch (error) {
            toast.error("Failed to clear data.");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 dark:text-slate-100">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center">
                        Control Center <Sparkles className="w-8 h-8 ml-3 text-indigo-500 animate-pulse" />
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Tune the NeuroClass AI engine and platform behavior.</p>
                </div>
                <div className="flex items-center space-x-2 text-sm font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full uppercase tracking-widest">
                    <Database className="w-4 h-4" />
                    <span>v2.1.0 stable</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Main Configuration Grid */}
                <div className="lg:col-span-8 space-y-8">

                    {/* SECTION: AI PERCEPTION & ENGINE */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden group">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center bg-indigo-50/30 dark:bg-indigo-900/10">
                            <div className="p-2.5 bg-indigo-600 rounded-xl mr-4 shadow-lg shadow-indigo-200 dark:shadow-none">
                                <Brain className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Perception & Mode</h2>
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold tracking-tight">System configuration for live Computer Vision tracking</p>
                            </div>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                                        <Zap className="w-4 h-4 mr-2 text-amber-500" /> Perception Sensitivity
                                    </label>
                                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl space-x-1">
                                        {['Low', 'Medium', 'High'].map(level => (
                                            <button
                                                key={level}
                                                onClick={() => setPerceptionLevel(level)}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${perceptionLevel === level ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                        {perceptionLevel === 'High' ? '⚠️ High CPU Load: Detects even subtle eye micro-movements' : 'Optimized for average classroom light conditions'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                                        <Monitor className="w-4 h-4 mr-2 text-blue-500" /> AI Computation Mode
                                    </label>
                                    <select
                                        value={aiEngine}
                                        onChange={(e) => setAiEngine(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option>High Performance (NVIDIA CUDA)</option>
                                        <option>Balanced (Neural Engine)</option>
                                        <option>Battery Saver (CPU Only)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                                        <Smartphone className="w-4 h-4 mr-2 text-emerald-500" /> Active Camera Source
                                    </label>
                                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl space-x-1">
                                        {[
                                            { label: 'Laptop', idx: 0 },
                                            { label: 'Mobile (USB)', idx: 1 }
                                        ].map(cam => (
                                            <button
                                                key={cam.idx}
                                                onClick={() => handleCameraChange(cam.idx)}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${cameraIndex === cam.idx ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {cam.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                        {cameraIndex === 1 ? '💡 Ensure Iriun/DroidCam is running on your phone' : 'Using built-in system camera'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg mr-3 text-emerald-600">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200">Face Blurring (Anonymity)</h4>
                                            <p className="text-xs text-slate-500">Enable HIPAA/GDPR class compliance</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleToggle('anonymize')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${toggles.anonymize ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${toggles.anonymize ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-3 text-indigo-600">
                                            <RefreshCw className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200">AI Timetable Auto-Start</h4>
                                            <p className="text-xs text-slate-500">Automatically sync sessions with schedule</p>
                                        </div>
                                    </div>
                                    <button onClick={handleAutoScheduleToggle} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${toggles.isAutoScheduleEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${toggles.isAutoScheduleEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: THRESHOLDS & ALERTS */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center bg-rose-50/30 dark:bg-rose-900/10">
                            <div className="p-2.5 bg-rose-600 rounded-xl mr-4 shadow-lg shadow-rose-200 dark:shadow-none">
                                <AlertCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Attention Thresholds</h2>
                                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold tracking-tight">Configure automated nudge and alert triggers</p>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Min. Class Engagement Threshold</label>
                                    <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-lg font-black text-sm">{engagementThreshold}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="80"
                                    value={engagementThreshold}
                                    onChange={(e) => setEngagementThreshold(e.target.value)}
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                                />
                                <p className="text-xs text-slate-400 mt-2 font-medium">If class engagement falls below this level for 5 minutes, you will receive a proactive dash-alert.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div onClick={() => handleToggle('emailAlerts')} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center space-x-4 ${toggles.emailAlerts ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-900/10' : 'border-slate-100 dark:border-slate-800'}`}>
                                    <div className={`p-3 rounded-xl ${toggles.emailAlerts ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm">Email Digest</h4>
                                        <p className="text-[10px] uppercase font-black text-slate-400">Weekly Performance</p>
                                    </div>
                                </div>
                                <div onClick={() => handleToggle('pushAlerts')} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center space-x-4 ${toggles.pushAlerts ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-900/10' : 'border-slate-100 dark:border-slate-800'}`}>
                                    <div className={`p-3 rounded-xl ${toggles.pushAlerts ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <Smartphone className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm">Critical Push</h4>
                                        <p className="text-[10px] uppercase font-black text-slate-400">Immediate Alerts</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Configuration Grid */}
                <div className="lg:col-span-4 space-y-8">

                    {/* SECTION: GAMIFICATION */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center bg-amber-50/30 dark:bg-amber-900/10">
                            <div className="p-2.5 bg-amber-500 rounded-xl mr-4 shadow-lg shadow-amber-200 dark:shadow-none">
                                <Trophy className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Gamification</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center">
                                    <Coins className="w-5 h-5 text-amber-500 mr-3" />
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-800">Focus Coins</h4>
                                        <p className="text-[10px] text-slate-500">Auto-reward attention</p>
                                    </div>
                                </div>
                                <button onClick={() => handleToggle('coinsEnabled')} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${toggles.coinsEnabled ? 'bg-amber-500' : 'bg-slate-300'}`}>
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${toggles.coinsEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center">
                                    <BarChart className="w-5 h-5 text-blue-500 mr-3" />
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-800">Live Leaderboard</h4>
                                        <p className="text-[10px] text-slate-500">Public attention rankings</p>
                                    </div>
                                </div>
                                <button onClick={() => handleToggle('leaderboardEnabled')} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${toggles.leaderboardEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${toggles.leaderboardEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* INTERFACE THEME */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center">
                            <Monitor className="w-5 h-5 text-slate-400 mr-3" />
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Interface</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleThemeChange('light')} className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all ${theme === 'light' ? 'bg-white border-2 border-primary-500 text-primary-700 shadow-md' : 'bg-slate-50 border-2 border-transparent text-slate-500'}`}>
                                    <Sun className="w-6 h-6 mb-2" />
                                    <span className="text-xs font-bold">Light</span>
                                </button>
                                <button onClick={() => handleThemeChange('dark')} className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all ${theme === 'dark' ? 'bg-slate-800 border-2 border-primary-500 text-primary-400 shadow-md' : 'bg-slate-50 border-2 border-transparent text-slate-500'}`}>
                                    <Moon className="w-6 h-6 mb-2" />
                                    <span className="text-xs font-bold">Dark</span>
                                </button>
                            </div>
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl">
                                <span className="text-xs font-bold text-slate-700 flex items-center">
                                    <Volume2 className="w-4 h-4 mr-2" /> Audio Cues
                                </span>
                                <button onClick={() => { setSoundEnabled(!soundEnabled); toast.success("Audio updated"); }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${soundEnabled ? 'bg-primary-600' : 'bg-slate-300'}`}>
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* DANGER AREA */}
                    <div className="bg-rose-50 dark:bg-rose-950 rounded-3xl border border-rose-200 dark:border-rose-900/50 p-6 space-y-4">
                        <div className="flex items-center space-x-2 text-rose-800 dark:text-rose-400 mb-2">
                            <Trash2 className="w-5 h-5" />
                            <h3 className="font-black uppercase tracking-tighter text-lg italic">Danger Zone</h3>
                        </div>
                        <button
                            onClick={handleClearDemoData}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-800 text-rose-600 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                        >
                            Factory Wipe Database
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Settings;
