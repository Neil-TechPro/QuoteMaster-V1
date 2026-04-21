import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const { login, user, loading: authLoading, authError } = useAuth();
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [signingIn, setSigningIn] = React.useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async () => {
    setLocalError(null);
    setSigningIn(true);
    try {
      await login();
      // login via redirect doesn't return, page will navigate away
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.code === 'auth/popup-blocked') {
        setLocalError("Sign-in popup was blocked. Please allow popups for this site.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setLocalError("Sign-in process was cancelled.");
      } else {
        setLocalError("Failed to sign in. Please try again.");
      }
      setSigningIn(false);
    }
  };

  const displayError = localError || authError;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary text-primary"></div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Verifying Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center space-y-10">
        <div className="space-y-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-lg">B</div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">BillKaro</h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No call. No wait. Just bill.</p>
        </div>
        
        {displayError && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold animate-in fade-in slide-in-from-top-1">
            {displayError}
          </div>
        )}

        <div className="pt-4 space-y-4">
          <button
            onClick={handleLogin}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 px-6 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 invert" />
            <span className="text-sm uppercase tracking-widest">
              {signingIn ? 'Checking Account...' : 'Sign in with Google'}
            </span>
          </button>

          <div className="pt-6 border-t border-slate-100 mt-6">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Having trouble logging in?</p>
            <button
              onClick={() => window.open(window.location.origin, '_blank')}
              className="text-[10px] text-primary font-black uppercase tracking-widest hover:underline"
            >
              Open in a New Tab to Fix Redirect Loop
            </button>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
          SECURE MULTI-TENANT INFRASTRUCTURE
        </p>
      </div>
    </div>
  );
}
