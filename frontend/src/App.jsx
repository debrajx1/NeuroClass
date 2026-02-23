import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sessions from './pages/Sessions';
import Students from './pages/Students';
import Analytics from './pages/Analytics';
import Report from './pages/Report';
import Settings from './pages/Settings';
import Sidebar from './components/Sidebar';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-950 relative transition-colors duration-300 min-h-screen">
        {children}
      </main>
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
      <Route path="/report/:id" element={<ProtectedRoute><Report /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
