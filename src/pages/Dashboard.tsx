import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, FileText, TrendingUp, Users as UsersIcon, Clock, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MOCK_CHART_DATA = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Apr', value: 2780 },
  { name: 'May', value: 1890 },
  { name: 'Jun', value: 2390 },
  { name: 'Jul', value: 3490 },
];

export function Dashboard() {
  const { profile } = useAuth();
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalOutstanding: 24500,
    overdue: 3200,
    drafts: 850
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.tenant_id) return;

    const q = query(
      collection(db, 'quotations'),
      where('tenant_id', '==', profile.tenant_id),
      orderBy('date', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentActivity(activities);
    }, (error) => {
      console.error("Dashboard quotations listener error:", error);
    });

    return () => unsubscribe();
  }, [profile?.tenant_id]);

  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-[120px]">
      {/* Header / Brand Card */}
      <div className="col-span-12 md:col-span-8 row-span-2 bg-white rounded-3xl border border-slate-200 p-8 flex flex-col justify-between shadow-sm">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">Total Outstanding</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-slate-900 tracking-tighter">
                ${stats.totalOutstanding.toLocaleString()}
              </span>
              <span className="text-2xl text-slate-300 font-bold">.00</span>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-green-50 text-green-600 rounded-lg flex items-center gap-1">
            <TrendingUp size={12} />
            +12.5%
          </span>
        </div>
        <div className="h-24 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_CHART_DATA}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="#4f46e5" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Action Card (Bento Multi-Color) */}
      <div className="col-span-12 md:col-span-4 row-span-2 bg-indigo-600 rounded-3xl p-8 text-white flex flex-col justify-between shadow-lg shadow-indigo-100">
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-indigo-200 uppercase tracking-widest">New Operation</h3>
          <p className="text-2xl font-bold tracking-tight">Ready to close a deal?</p>
        </div>
        <button 
          onClick={() => navigate('/create')}
          className="w-full h-14 bg-white text-indigo-600 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group"
        >
          <Plus size={18} />
          <span>Create Quote</span>
          <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* Overdue Card (Bento Pink/Red) */}
      <div className="col-span-12 sm:col-span-4 row-span-2 bg-rose-50 rounded-3xl border border-rose-100 p-8 flex flex-col justify-between shadow-sm">
        <h3 className="text-xs font-bold text-rose-800 uppercase tracking-widest">Overdue</h3>
        <div className="flex items-end justify-between">
          <span className="text-4xl font-black text-rose-600 tracking-tighter">${stats.overdue.toLocaleString()}</span>
          <div className="text-right text-[10px] text-rose-700 font-bold leading-tight">
            <p>ACTION REQUIRED</p>
            <p>3 clients pending</p>
          </div>
        </div>
      </div>

      {/* Drafts Card */}
      <div className="col-span-12 sm:col-span-4 row-span-2 bg-white rounded-3xl border border-slate-200 p-8 flex flex-col justify-between shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Drafts</h3>
        <div className="flex items-end justify-between">
          <span className="text-4xl font-black text-slate-900 tracking-tighter">${stats.drafts.toLocaleString()}</span>
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Team / Users Card (Bento Dark) */}
      <div className="col-span-12 sm:col-span-4 row-span-2 bg-slate-900 rounded-3xl p-8 text-white flex flex-col justify-between shadow-xl">
        <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Team Sales</h3>
        <div className="space-y-3">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                {String.fromCharCode(64 + i)}
              </div>
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-indigo-600 flex items-center justify-center text-[10px] font-bold">+2</div>
          </div>
          <p className="text-xs text-slate-400 font-medium">6 active reps this month</p>
        </div>
      </div>

      {/* Recent Activity (Large Horizontal) */}
      <div className="col-span-12 row-span-4 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Recent Activity</h3>
          <button className="text-indigo-600 text-xs font-bold hover:underline tracking-widest uppercase">View All Logs</button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {recentActivity.length > 0 ? (
            <div className="space-y-2">
              {recentActivity.map((item) => (
                <div key={item.id} className="group flex items-center justify-between p-4 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-sm">
                      {(item.client?.name || item.clientName)?.slice(0, 2).toUpperCase() || 'QU'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{item.client?.name || item.clientName || 'Unnamed Client'}</h4>
                      <p className="text-[10px] text-muted font-bold tracking-tight uppercase">
                        {item.quotation_number} • {item.date ? format(item.date.toDate(), 'MMM d') : 'No Date'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-black text-slate-800">${item.grand_total?.toLocaleString()}</span>
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest w-20 text-center",
                      item.status === 'paid' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                      item.status === 'overdue' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                      "bg-slate-100 text-slate-500 border border-slate-200"
                    )}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200">
                <FileText size={32} />
              </div>
              <p className="text-slate-400 text-sm font-bold">Waiting for your first transaction...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
