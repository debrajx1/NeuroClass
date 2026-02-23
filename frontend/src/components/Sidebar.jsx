import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Users, Activity, Settings, LogOut, BrainCircuit, UsersRound } from 'lucide-react';

const Sidebar = () => {
    const { logout, user } = useContext(AuthContext);
    const location = useLocation();

    const links = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Sessions', path: '/sessions', icon: Users },
        { name: 'Students', path: '/students', icon: UsersRound },
        { name: 'Analytics', path: '/analytics', icon: Activity },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <div className="h-screen w-64 bg-dark-900 flex flex-col shadow-2xl transition-all duration-300">
            <div className="p-6 flex items-center space-x-3 mb-6">
                <div className="p-2 bg-primary-500/10 rounded-lg">
                    <BrainCircuit className="w-8 h-8 text-primary-500" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">NeuroClass</h1>
                    <p className="text-xs text-slate-400 font-medium">Privacy UI</p>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.path;
                    return (
                        <Link
                            key={link.name}
                            to={link.path}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                : 'text-slate-400 hover:bg-dark-800 hover:text-white'
                                }`}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white dark:bg-slate-900 rounded-r-md"></div>
                            )}
                            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary-400'}`} />
                            <span className="font-medium">{link.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-dark-800">
                <div className="flex items-center mb-4 px-2">
                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                        {user?.name?.charAt(0) || 'T'}
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-white truncate w-36">{user?.name || 'Teacher'}</p>
                        <p className="text-xs text-slate-400 truncate w-36">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center w-full px-4 py-2 text-sm font-medium text-slate-400 bg-dark-800 rounded-lg hover:text-red-400 hover:bg-dark-700 transition-colors"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
