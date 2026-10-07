import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { lazyWithRetry } from './utils/lazyWithRetry';

const Login = lazyWithRetry(() => import('./pages/Login'), 'Login');
const Register = lazyWithRetry(() => import('./pages/Register'), 'Register');
const DashboardHome = lazyWithRetry(() => import('./pages/DashboardHome'), 'DashboardHome');
const Transactions = lazyWithRetry(() => import('./pages/Transactions'), 'Transactions');
const Import = lazyWithRetry(() => import('./pages/Import'), 'Import');
const Profile = lazyWithRetry(() => import('./pages/Profile'), 'Profile');
const Analysis = lazyWithRetry(() => import('./pages/Analysis'), 'Analysis');
const Privacy = lazyWithRetry(() => import('./pages/Privacy'), 'Privacy');
const Terms = lazyWithRetry(() => import('./pages/Terms'), 'Terms');
const NotFound = lazyWithRetry(() => import('./pages/NotFound'), 'NotFound');

const LoadingFallback = () => (
  <div className="min-h-screen bg-ink-50 dark:bg-ink-900 flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <LoadingFallback />;
  }
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <LoadingFallback />;
  }
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/dashboard" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
              <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
              <Route path="/analysis" element={<PrivateRoute><Analysis /></PrivateRoute>} />
              <Route path="/import" element={<PrivateRoute><Import /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;