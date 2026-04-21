import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, RefreshCw, LogOut } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, sendVerification, reloadUser, logout } = useAuth();
  const [sendingAlert, setSendingAlert] = useState(false);
  const [verifying, setVerifying] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.emailVerified) {
    const handleSendVerification = async () => {
      setSendingAlert(true);
      await sendVerification();
      setTimeout(() => setSendingAlert(false), 5000);
    };

    const handleVerify = async () => {
      setVerifying(true);
      await reloadUser();
      setVerifying(false);
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail size={32} />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">Verify your email</h2>
          <p className="text-sm text-slate-500 font-medium">
            We require all users to verify their email addresses to maintain security. Please check the inbox for <strong className="text-slate-800">{user.email}</strong>.
          </p>

          <div className="pt-4 space-y-3">
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="w-full flex items-center justify-center gap-2 h-14 bg-primary text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all disabled:opacity-50"
            >
              {verifying ? <RefreshCw className="animate-spin" size={20} /> : 'I have verified my email'}
            </button>
            
            <button
              onClick={handleSendVerification}
              disabled={sendingAlert}
              className="w-full h-12 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              {sendingAlert ? 'Verification email sent!' : 'Resend verification email'}
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 h-12 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-all"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is logged in but doesn't have a profile yet, redirect to onboarding
  // unless we are already on the onboarding page
  if (!profile && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
