import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("[ErrorBoundary] Caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm m-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-full mb-6">
                        <AlertTriangle className="w-12 h-12 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Something went wrong</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                        The component encountered an unexpected error. Don't worry, the rest of the app is still working.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all"
                    >
                        <RefreshCcw className="w-5 h-5 mr-2" />
                        Reload Page
                    </button>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-950 rounded-lg text-left overflow-auto max-w-full">
                            <p className="text-xs font-mono text-red-500 whitespace-pre-wrap">
                                {this.state.error?.toString()}
                            </p>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
