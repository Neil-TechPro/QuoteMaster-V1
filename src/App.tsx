import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Menu, X } from 'lucide-react';
import { cn } from './lib/utils';
import { Dashboard } from './pages/Dashboard';
import { CreateQuote } from './pages/CreateQuote';
import { Clients } from './pages/Clients';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';

function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen w-full bg-background-light overflow-hidden relative">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold tracking-tighter">B</div>
          <span className="font-bold text-slate-800">BillKaro</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-500"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar - Desktop & Mobile overlay */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-[60] lg:static lg:block transition-transform duration-300 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto p-6 md:p-12 pt-24 lg:pt-12">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><Layout><CreateQuote /></Layout></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><Layout><Clients /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
