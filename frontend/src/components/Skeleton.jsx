import React from 'react';

const Skeleton = ({ className, variant = "rect" }) => {
    const baseClass = "animate-pulse bg-slate-200 dark:bg-slate-800";
    const variantClass = variant === "circle" ? "rounded-full" : "rounded-xl";

    return <div className={`${baseClass} ${variantClass} ${className}`}></div>;
};

export const CardSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center space-x-4">
            <Skeleton className="w-12 h-12" variant="circle" />
            <div className="space-y-2">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-16 h-6" />
            </div>
        </div>
    </div>
);

export const ChartSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <Skeleton className="w-48 h-6 mb-8" />
        <div className="h-[300px] w-full flex items-end justify-between space-x-4 px-4">
            {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className={`w-full flex-1`} style={{ height: `${Math.floor(Math.random() * 60) + 20}%` }} />
            ))}
        </div>
    </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <Skeleton className="w-40 h-6" />
        </div>
        <div className="p-6 space-y-4">
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900 last:border-0">
                    <div className="flex items-center space-x-3">
                        <Skeleton className="w-10 h-10" variant="circle" />
                        <div className="space-y-2">
                            <Skeleton className="w-32 h-4" />
                            <Skeleton className="w-20 h-3" />
                        </div>
                    </div>
                    <Skeleton className="w-24 h-8 rounded-lg" />
                </div>
            ))}
        </div>
    </div>
);

export default Skeleton;
