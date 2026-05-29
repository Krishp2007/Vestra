import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import useStore from './store/useStore';
import api from './utils/api';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import SIPPage from './pages/SIPPage';
import FDPage from './pages/FDPage';
import StockPage from './pages/StockPage';
import MembersPage from './pages/MembersPage';
import MemberDashboard from './pages/MemberDashboard';
import AlertsPage from './pages/AlertsPage';
import InsightsPage from './pages/InsightsPage';
import QuickAddPage from './pages/QuickAddPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }) {
  const { token } = useStore();
  if (!token) return <Navigate to="/home" replace />;
  return children;
}

export default function App() {
  const { token, setUser, logout } = useStore();

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => logout());
    }
  }, [token, setUser, logout]);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' },
        success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
        error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
      }} />
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="sips" element={<SIPPage />} />
          <Route path="fds" element={<FDPage />} />
          <Route path="stocks" element={<StockPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="member/:memberId" element={<MemberDashboard />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="add" element={<QuickAddPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
