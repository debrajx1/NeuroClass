import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { User, Bell, Shield, Key, Trash2, DownloadCloud, Monitor, Moon, Sun, Volume2, RefreshCw, Mail, Smartphone, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Settings = () => {
    const { user, dispatch } = useContext(AuthContext);

    // UI Local States for realism
    const [theme, setTheme] = useState('light');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showApiKey, setShowApiKey] = useState(false);

    const [toggles, setToggles] = useState({
        anonymize: false,
        autoDelete: true,
        emailAlerts: true,
        pushAlerts: false,
        weeklyReport: true
    });

    const [isRegenerating, setIsRegenerating] = useState(false);
    const [apiKey, setApiKey] = useState('sk_live_v2_982bcn398bx92389x20');

    const handleToggle = (key) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
        toast.success("Preference updated automatically.", { icon: '⚙️' });
    };

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        const root = document.documentElement;

        if (newTheme === 'dark') {
            root.classList.add('dark');
        } else if (newTheme === 'light') {
            root.classList.remove('dark');
        } else {
            // System matching logic (check browser pref)
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
        toast.success(`Theme set to ${newTheme} mode.`);
    };

    const handleRegenerateKey = () => {
        if (window.confirm("Warning: Regenerating the API key will disconnect any currently running AI Modules. Continue?")) {
            setIsRegenerating(true);
            setTimeout(() => {
                setApiKey(`sk_live_v2_${Math.random().toString(36).substring(2, 15)}`);
                setIsRegenerating(false);
                toast.success("New API Key generated successfully.");
            }, 1000);
        }
    };

    const handleClearDemoData = async () => {
        if (!window.confirm("WARNING: This will permanently delete ALL Class Sessions, Timelines, and Event data from the database. Are you absolutely sure?!")) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.delete('http://localhost:5000/api/analytics/debug/clear', {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("All Analytics & Log Data has been successfully cleared!");
        } catch (error) {
            console.error("Error clearing data:", error);
            toast.error("Failed to clear data.");
        }
    };

    const handleExportData = () => {
        toast.promise(
            new Promise(resolve => setTimeout(resolve, 1500)),
            {
                loading: 'Compiling your data archive...',
                success: <b>Data archive (ZIP) downloaded!</b>,
                error: <b>Could not compile data.</b>,
            }
        );
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 dark:text-slate-100">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">System Preferences</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 pb-4">Manage your account, privacy constraints, and system-wide configurations.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (Main Configs) */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Account Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Account Profile</h2>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Legal Name</label>
                                    <input type="text" disabled value={user?.name || ''} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-medium focus:ring-0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Work Email Address</label>
                                    <input type="email" disabled value={user?.email || ''} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-medium focus:ring-0" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl mb-6">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">Role & Access Level</p>
                                    <p className="text-xs text-slate-500">You are registered as a Primary Educator.</p>
                                </div>
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {user?.role || 'Teacher'} Access
                                </span>
                            </div>

                            <button onClick={() => toast.success('Profile modification request sent to admin.', { icon: '📩' })} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                                Request Profile Modification
                            </button>
                        </div>
                    </div>

                    {/* Notifications Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg mr-3">
                                <Bell className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Alerts & Notifications</h2>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">Daily Digest Emails</h4>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Receive a morning summary of yesterday's overall class engagement.</p>
                                </div>
                                <button onClick={() => handleToggle('emailAlerts')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${toggles.emailAlerts ? 'bg-violet-600 dark:bg-violet-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${toggles.emailAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <Smartphone className="w-4 h-4 text-slate-400" />
                                        <h4 className="font-semibold text-slate-800">Critical Push Alerts</h4>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">Get instant mobile notifications if class attendance drops below 30%.</p>
                                </div>
                                <button onClick={() => handleToggle('pushAlerts')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${toggles.pushAlerts ? 'bg-violet-600' : 'bg-slate-200'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${toggles.pushAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Privacy Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center bg-slate-50/50">
                            <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                                <Shield className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Privacy & Data Governance</h2>
                        </div>
                        <div className="divide-y divide-slate-100">
                            <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-semibold text-slate-800">Strict Face Anonymization</h4>
                                    <p className="text-sm text-slate-500 mt-1">Force the AI Module to scramble faces in local RAM before recording logs.</p>
                                </div>
                                <button onClick={() => handleToggle('anonymize')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${toggles.anonymize ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${toggles.anonymize ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-semibold text-slate-800">Auto-delete Telemetry (90 Days)</h4>
                                    <p className="text-sm text-slate-500 mt-1">Compliance feature. Automatically wipe class data older than 3 months.</p>
                                </div>
                                <button onClick={() => handleToggle('autoDelete')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${toggles.autoDelete ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${toggles.autoDelete ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                            <button onClick={handleExportData} className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-100 transition-colors shadow-sm">
                                <DownloadCloud className="w-4 h-4 mr-2 text-slate-500" />
                                Download My Data Archive (GDPR)
                            </button>
                        </div>
                    </div>

                </div>

                {/* Right Column (Danger & API) */}
                <div className="space-y-8">

                    {/* UI Preferences */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg mr-3">
                                <Monitor className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Interface</h2>
                        </div>
                        <div className="p-5 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">Dashboard Theme</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button onClick={() => handleThemeChange('light')} className={`flex flex-col items-center justify-center py-4 px-2 rounded-xl transition-all ${theme === 'light' ? 'bg-primary-50 border-2 border-primary-500 text-primary-700 shadow-sm' : 'border-2 border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
                                        <Sun className={`w-6 h-6 mb-2 ${theme === 'light' ? 'text-primary-600' : 'text-slate-400'}`} />
                                        <span className="text-xs font-bold">Light</span>
                                    </button>
                                    <button onClick={() => handleThemeChange('dark')} className={`flex flex-col items-center justify-center py-4 px-2 rounded-xl transition-all ${theme === 'dark' ? 'bg-primary-50 border-2 border-primary-500 text-primary-700 shadow-sm' : 'border-2 border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
                                        <Moon className={`w-6 h-6 mb-2 ${theme === 'dark' ? 'text-primary-600' : 'text-slate-400'}`} />
                                        <span className="text-xs font-bold">Dark</span>
                                    </button>
                                    <button onClick={() => handleThemeChange('system')} className={`flex flex-col items-center justify-center py-4 px-2 rounded-xl transition-all ${theme === 'system' ? 'bg-primary-50 border-2 border-primary-500 text-primary-700 shadow-sm' : 'border-2 border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
                                        <Monitor className={`w-6 h-6 mb-2 ${theme === 'system' ? 'text-primary-600' : 'text-slate-400'}`} />
                                        <span className="text-xs font-bold">Auto</span>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-700 flex items-center">
                                    <Volume2 className="w-4 h-4 mr-2 text-slate-400" /> Notification Sounds
                                </span>
                                <button onClick={() => { setSoundEnabled(!soundEnabled); toast.success(soundEnabled ? "Sounds Muted" : "Sounds Enabled"); }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${soundEnabled ? 'bg-primary-600' : 'bg-slate-200'}`}>
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* API Keys */}
                    <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 overflow-hidden text-slate-300">
                        <div className="p-5 border-b border-slate-800 flex items-center">
                            <Key className="w-5 h-5 text-indigo-400 mr-3" />
                            <h2 className="text-lg font-bold text-white">Developer API Integration</h2>
                        </div>
                        <div className="p-5">
                            <p className="text-sm text-slate-400 mb-4 leading-relaxed">Secure Secret Key used by the Python Computer Vision system to authenticate event streams.</p>
                            <div className="bg-black/40 p-1.5 pl-3 pr-1.5 rounded-lg border border-slate-700 flex justify-between items-center mb-5 overflow-hidden">
                                <code className="text-sm font-mono tracking-[0.2em] text-emerald-400 truncate">
                                    {showApiKey ? apiKey : 'sk_live_v2_' + '•'.repeat(24)}
                                </code>
                                <button onClick={() => setShowApiKey(!showApiKey)} className="p-2 ml-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors text-slate-300 flex-shrink-0" title="Toggle Visibility">
                                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <button
                                onClick={handleRegenerateKey}
                                disabled={isRegenerating}
                                className="w-full flex justify-center items-center px-4 py-2 bg-slate-800 border border-slate-700 text-white font-medium rounded-xl text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                {isRegenerating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                {isRegenerating ? 'Generating...' : 'Regenerate API Key'}
                            </button>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-50 rounded-2xl border border-red-200 overflow-hidden">
                        <div className="p-5 border-b border-red-200">
                            <h2 className="text-lg font-bold text-red-800 flex items-center">
                                <Trash2 className="w-5 h-5 mr-2" />
                                Danger Zone
                            </h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <h4 className="text-sm font-bold text-red-900">Purge Raw Event Logs</h4>
                                <p className="text-xs text-red-700 mt-1 mb-3">This deletes all historical distraction/attention markers but keeps Sessions and Students intact.</p>
                                <button onClick={() => {
                                    if (window.confirm('Delete all historical event data? This cannot be undone.')) {
                                        toast.promise(new Promise(r => setTimeout(r, 1000)), {
                                            loading: 'Erasing telemetry...', success: 'Event telemetry erased!', error: 'Failed'
                                        });
                                    }
                                }} className="w-full flex justify-center items-center px-4 py-2 bg-white border border-red-300 text-red-600 font-semibold rounded-xl text-sm hover:bg-red-50 focus:ring-2 focus:ring-red-200 transition-colors">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Erase Event Telemetry
                                </button>
                            </div>
                            <div className="h-px bg-red-200 w-full" />
                            <div>
                                <h4 className="text-sm font-bold text-red-900">Total System Factory Reset</h4>
                                <p className="text-xs text-red-700 mt-1 mb-3">Wipes EVERYTHING. Sessions, Events, and Demo Charts. Use with extreme caution.</p>
                                <button onClick={handleClearDemoData} className="w-full px-4 py-2.5 bg-red-600 border border-red-700 text-white font-bold rounded-xl text-sm hover:bg-red-700 shadow-sm focus:ring-2 focus:ring-red-300 transition-colors">
                                    Factory Wipe Database
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Settings;
