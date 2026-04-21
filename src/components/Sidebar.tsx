import React from 'react';
import { LayoutDashboard, FileText, Users, Settings, PlusCircle, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
    { icon: FileText, label: 'Invoices', to: '/invoices' },
    { icon: Users, label: 'Clients', to: '/clients' },
  ];

  if (profile?.role === 'client_admin' || profile?.role === 'super_admin') {
    navItems.push({ icon: Settings, label: 'Settings', to: '/settings' });
  }

  return (
    <aside className="w-64 h-full bg-white border-r border-border-main flex flex-col justify-between p-6 overflow-y-auto">
      <div className="space-y-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold tracking-tighter">B</div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">BillKaro</h1>
            <p className="text-[10px] font-black text-muted uppercase tracking-widest mt-1">No call. No wait. Just bill.</p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group",
                  isActive 
                    ? "bg-primary-light text-primary" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} />
                  <span className="font-bold text-sm tracking-tightish">{item.label}</span>
                  <div
                    className={cn(
                      "absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full transition-transform duration-300",
                      isActive ? "scale-y-100" : "scale-y-0 group-hover:scale-y-50"
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => {
            navigate('/create');
            onClose?.();
          }}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-800 transition-all"
        >
          <PlusCircle size={18} />
          <span>New Quote</span>
        </button>

        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 p-1">
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
              {profile?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate leading-none">{profile?.name || 'User'}</p>
              <p className="text-[10px] text-muted font-bold tracking-tight mt-1 truncate">{profile?.role || 'Sales Rep'}</p>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
