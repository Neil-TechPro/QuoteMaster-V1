import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, FileText, TrendingUp, Users as UsersIcon, Clock, ArrowUpRight, CheckCircle2 } from 'lucide-react';
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
  const { profile, user } = useAuth();
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalOutstanding: 24500, // For admin
    overdue: 3200,           // For admin
    drafts: 850,             // Shared
    myTotal: 12400,          // For rep
    myConversions: 15        // For rep
  });
  const navigate = useNavigate();

  const isAdmin = profile?.role === 'client_admin' || profile?.role === 'super_admin';

  useEffect(() => {
    if (!profile?.tenant_id || !user?.uid) return;

    // Admin sees all, Reps see their own
    const baseConditions = [where('tenant_id', '==', profile.tenant_id)];
    if (!isAdmin) {
      baseConditions.push(where('sales_rep_id', '==', user.uid));
    }

    const q = query(
      collection(db, 'quotations'),
      ...baseConditions,
      orderBy('updated_at', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentActivity(activities);
      
      // Calculate dynamic stats for reps based on fetched data
      if (!isAdmin) {
        let total = 0;
        let drafts = 0;
        let conversions = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === 'draft') drafts += (data.grand_total || 0);
          if (data.status === 'converted') conversions += 1;
          total += (data.grand_total || 0);
        });
        setStats(prev => ({ ...prev, myTotal: total, drafts: drafts, myConversions: conversions }));
      }
    }, (error) => {
      console.error("Dashboard quotations listener error:", error);
    });

    return () => unsubscribe();
  }, [profile?.tenant_id, user?.uid, isAdmin]);

  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-[120px]">
      
      {/* Dynamic Header Card */}
      {isAdmin ? (
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
      ) : (
        <div className="col-span-12 md:col-span-8 row-span-2 bg-white rounded-3xl border border-slate-200 p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <TrendingUp size={160} />
          </div>
          <div className="space-y-1 z-10">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">My Pipeline Value</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-slate-900 tracking-tighter">
                ${stats.myTotal.toLocaleString()}
              </span>
              <span className="text-2xl text-slate-300 font-bold">.00</span>
            </div>
          </div>
          <div className="flex items-center gap-4 z-10 pt-4 border-t border-slate-100">
             <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>{stats.myConversions} deals closed this month</span>
             </div>
          </div>
        </div>
      )}

      {/* Quick Action Card (Bento Multi-Color) */}
      <div className="col-span-12 md:col-span-4 row-span-2 bg-primary rounded-3xl p-8 text-white flex flex-col justify-between shadow-lg shadow-blue-900/20">
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-blue-200 uppercase tracking-widest">New Operation</h3>
          <p className="text-2xl font-bold tracking-tight">Ready to close a deal?</p>
        </div>
        <button 
          onClick={() => navigate('/create')}
          className="w-full h-14 bg-white text-primary rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group"
        >
          <Plus size={18} />
          <span>Create Quote</span>
          <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* Overdue / Personal Stats Card */}
      {isAdmin ? (
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
      ) : (
        <div className="col-span-12 sm:col-span-4 row-span-2 bg-emerald-50 rounded-3xl border border-emerald-100 p-8 flex flex-col justify-between shadow-sm">
          <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Active Clients</h3>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-emerald-600 tracking-tighter">12</span>
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <UsersIcon size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Drafts Card (Shared) */}
      <div className="col-span-12 sm:col-span-4 row-span-2 bg-white rounded-3xl border border-slate-200 p-8 flex flex-col justify-between shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">My Drafts</h3>
        <div className="flex items-end justify-between">
          <span className="text-4xl font-black text-slate-900 tracking-tighter">${stats.drafts.toLocaleString()}</span>
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Team / Users Card (Admin only) or Recent Leads (Rep) */}
      {isAdmin ? (
        <div className="col-span-12 sm:col-span-4 row-span-2 bg-slate-900 rounded-3xl p-8 text-white flex flex-col justify-between shadow-xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Team Sales</h3>
          <div className="space-y-3">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-primary flex items-center justify-center text-[10px] font-bold">+2</div>
            </div>
            <p className="text-xs text-slate-400 font-medium">6 active reps this month</p>
          </div>
        </div>
      ) : (
         <div className="col-span-12 sm:col-span-4 row-span-2 bg-slate-900 rounded-3xl p-8 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute -bottom-4 -right-4 text-slate-800 opacity-50">
            <Clock size={100} />
          </div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest z-10">Time to Follow Up</h3>
          <div className="z-10">
            <p className="text-3xl font-black text-white tracking-tighter">3</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Pending Quotes</p>
          </div>
        </div>
      )}

      {/* Recent Activity (Large Horizontal) */}
      <div className="col-span-12 row-span-4 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">{isAdmin ? 'Recent Global Activity' : 'My Recent Activity'}</h3>
          <button className="text-primary text-xs font-bold hover:underline tracking-widest uppercase">View All</button>
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
                        {item.quotation_number} • {item.created_at || item.updated_at ? format((item.created_at || item.updated_at).toDate(), 'MMM d, yyyy') : 'No Date'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-black text-slate-800">${item.grand_total?.toLocaleString() || '0'}</span>
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest w-20 text-center",
                      item.status === 'paid' || item.status === 'converted' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                      item.status === 'overdue' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                      item.status === 'draft' ? "bg-slate-100 text-slate-500 border border-slate-200" :
                      "bg-blue-50 text-blue-600 border border-blue-100" // sent/accepted
                    )}>
                      {item.status || 'draft'}
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
