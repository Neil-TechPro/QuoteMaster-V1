import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

export function Onboarding() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [state, setState] = useState('Gujarat');
  const [gstin, setGstin] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyName) return;

    setLoading(true);
    try {
      const tenantId = crypto.randomUUID();
      
      // Create Tenant
      await setDoc(doc(db, 'tenants', tenantId), {
        company_name: companyName,
        state: state,
        gstin: gstin,
        is_active: true,
        quotation_prefix: 'QT-2026-',
// ... line 27 ...
        invoice_prefix: 'INV-2026-',
        quotation_counter: 1,
        invoice_counter: 1,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Create User Profile linked to Tenant
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        tenant_id: tenantId,
        name: user.displayName || 'Unnamed User',
        email: user.email,
        role: 'client_admin', // First user is admin
        is_active: true,
        created_at: serverTimestamp()
      });

      navigate('/');
    } catch (error) {
      console.error("Onboarding failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-12 space-y-12 border border-slate-200">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 bg-indigo-50 text-primary rounded-xl flex items-center justify-center mx-auto">
            <PlusCircle size={24} />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">New Workspace</h2>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Initialization Required</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Organization</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Lumina Strategy"
              className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 focus:ring-1 focus:ring-primary transition-all text-slate-800 font-bold placeholder-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">State (Base)</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 focus:ring-1 focus:ring-primary transition-all text-slate-800 font-bold"
              >
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GSTIN (Optional)</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="24AAAAA0000A1Z5"
                className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 focus:ring-1 focus:ring-primary transition-all text-slate-800 font-bold placeholder-slate-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all disabled:opacity-50"
          >
            {loading ? 'Initializing...' : 'Create Studio'}
          </button>
        </form>
      </div>
    </div>
  );
}
