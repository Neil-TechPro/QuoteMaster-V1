import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

export function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center space-y-10">
        <div className="space-y-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-lg shadow-indigo-100">Q</div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">QuoteMaster</h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Enterprise SaaS Billing</p>
        </div>
        
        <div className="pt-4">
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 px-6 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 invert" />
            <span className="text-sm uppercase tracking-widest">Sign in with Google</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
          SECURE MULTI-TENANT INFRASTRUCTURE
        </p>
      </div>
    </div>
  );
}
