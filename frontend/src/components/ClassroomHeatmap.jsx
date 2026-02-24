import React, { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';

const ClassroomHeatmap = ({ liveEvents }) => {
    // We'll create a 5x5 grid representing 25 seats
    const [desks, setDesks] = useState(Array(25).fill(null));

    // Map the most recent event for each student to a desk.
    // In a real app, students would have assigned seats, but here we dynamically assign them
    // to visually fill the grid for the demo.

    useEffect(() => {
        if (!liveEvents || liveEvents.length === 0) return;

        const newDesks = [...desks];

        // Let's create a map of unique student events (latest first)
        const uniqueStudents = {};
        for (let ev of liveEvents) {
            const sId = ev.studentRef?._id || ev.anonymousId;
            if (!uniqueStudents[sId]) {
                uniqueStudents[sId] = ev;
            }
        }

        // Assign fixed seats dynamically based on ID string hash so they don't jump around
        Object.values(uniqueStudents).forEach(ev => {
            const sId = ev.studentRef?._id || ev.anonymousId;
            let hash = 0;
            if (sId) {
                for (let i = 0; i < sId.length; i++) {
                    hash = ((hash << 5) - hash) + sId.charCodeAt(i);
                    hash |= 0; // Convert to 32bit integer
                }
            }
            // Seed the grid deterministically. If a seat is taken, find the next available.
            let seatIndex = Math.abs(hash) % 25;
            let attempts = 0;
            while (newDesks[seatIndex] !== null && newDesks[seatIndex].studentRef?._id !== ev.studentRef?._id && attempts < 25) {
                seatIndex = (seatIndex + 1) % 25;
                attempts++;
            }
            newDesks[seatIndex] = ev;
        });

        setDesks(newDesks);
    }, [liveEvents]);

    const getDeskStyles = (ev) => {
        if (!ev) return {
            wrapper: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
            icon: "text-slate-300 dark:text-slate-600",
            status: "bg-slate-200 dark:bg-slate-700 text-slate-400"
        };

        const state = ev.state;
        if (['attentive', 'using laptop', 'reading book'].includes(state)) {
            return {
                wrapper: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 animate-pulse-slow shadow-[0_0_15px_rgba(34,197,94,0.3)]",
                icon: "text-green-500",
                status: "bg-green-100 text-green-700 font-bold",
                label: "Focused"
            };
        } else if (['phone', 'distracted', 'looking away'].includes(state)) {
            return {
                wrapper: "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.4)]",
                icon: "text-amber-500",
                status: "bg-amber-100 text-amber-700 font-bold",
                label: state
            };
        } else if (['sleeping'].includes(state)) {
            return {
                wrapper: "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-[0_0_15px_rgba(59,130,246,0.3)]",
                icon: "text-blue-500",
                status: "bg-blue-100 text-blue-700 font-bold",
                label: "Sleeping"
            };
        } else {
            return {
                wrapper: "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]",
                icon: "text-red-500",
                status: "bg-red-100 text-red-700 font-bold",
                label: state
            };
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Live Classroom Heatmap</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Spatial engagement tracking</p>
                </div>
                <div className="flex space-x-3 text-xs font-semibold">
                    <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-400 mr-1 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span> Focus</span>
                    <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-amber-400 mr-1 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span> Distracted</span>
                    <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-400 mr-1 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span> Sleeping</span>
                </div>
            </div>

            <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-xl border-2 border-slate-100 dark:border-slate-800 p-6 perspective-[1000px]">
                {/* Teacher Desk Indicator */}
                <div className="w-48 h-10 bg-slate-200 dark:bg-slate-800 mx-auto rounded-md border-b-4 border-slate-300 dark:border-slate-700 mb-10 flex items-center justify-center shadow-lg transform rotate-x-12">
                    <span className="font-bold text-slate-500 dark:text-slate-400 tracking-widest text-sm uppercase">Whiteboard</span>
                </div>

                <div className="grid grid-cols-5 gap-4">
                    {desks.map((ev, i) => {
                        const styles = getDeskStyles(ev);
                        const name = ev ? (ev.studentRef ? ev.studentRef.name.split(' ')[0] : `Anon-${ev.anonymousId.substring(0, 3)}`) : 'Empty';

                        return (
                            <div key={i} className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-500 transform hover:-translate-y-1 hover:scale-105 ${styles.wrapper}`}>
                                <div className="absolute -top-3 w-8 h-8 rounded-full border border-inherit flex items-center justify-center bg-white dark:bg-slate-900 z-10 shadow-sm overflow-hidden">
                                    {ev?.studentRef?.imageUrl ? (
                                        <img src={ev.studentRef.imageUrl} alt="P" className="w-full h-full object-cover" />
                                    ) : (
                                        <Monitor className={`w-4 h-4 ${styles.icon}`} />
                                    )}
                                </div>
                                <div className="mt-3 text-center w-full">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{name}</p>
                                    <div className={`mt-1 text-[9px] uppercase tracking-wider rounded px-1 truncate ${styles.status}`}>
                                        {styles.label || 'Inactive'}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default ClassroomHeatmap;
