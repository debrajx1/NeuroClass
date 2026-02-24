import React from 'react';

const Loader = ({ message = "Loading..." }) => {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center min-h-[300px] space-y-6 animate-in fade-in duration-500">
            <div className="relative flex items-center justify-center w-20 h-20">
                {/* Outer pulsing ring */}
                <div className="absolute inset-0 rounded-full border-4 border-primary-200 dark:border-slate-800 opacity-20"></div>
                {/* Fast spinning inner ring */}
                <div className="absolute inset-0 rounded-full border-4 border-primary-600 border-t-transparent animate-spin"></div>
                {/* Slower spinning middle ring */}
                <div className="absolute inset-2 rounded-full border-4 border-indigo-400 border-b-transparent animate-[spin_2s_linear_infinite_reverse] opacity-80"></div>
                {/* Center dot */}
                <div className="w-4 h-4 rounded-full bg-primary-500 animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.6)]"></div>
            </div>

            <div className="flex flex-col items-center space-y-1">
                <div className="text-slate-600 dark:text-slate-300 font-semibold text-sm tracking-widest uppercase flex items-center">
                    {message}
                    <span className="flex ml-1">
                        <span className="animate-[bounce_1s_infinite_0ms] mx-0.5">.</span>
                        <span className="animate-[bounce_1s_infinite_150ms] mx-0.5">.</span>
                        <span className="animate-[bounce_1s_infinite_300ms] mx-0.5">.</span>
                    </span>
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">Please wait a moment</div>
            </div>
        </div>
    );
};

export default Loader;
