import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { setDoc, doc, serverTimestamp, getDocs, query, collection, where, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, UserPlus, Loader2 } from 'lucide-react';

export function Onboarding() {
  const { user, profile } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [state, setState] = useState('Gujarat');
  const [gstin, setGstin] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [inviteFound, setInviteFound] = useState<any>(null);
  const navigate = useNavigate();

  // Manual fallback check for invitations
  useEffect(() => {
    const checkInvite = async () => {
      if (!user || profile) return;
      setCheckingInvite(true);
      try {
        const querySnapshot = await getDocs(
          query(collection(db, 'invitations'), where('email', '==', user.email?.trim().toLowerCase()))
        );
        if (!querySnapshot.empty) {
          setInviteFound({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
        }
      } catch (err) {
        console.error("Manual invite check failed:", err);
      } finally {
        setCheckingInvite(false);
      }
    };
    checkInvite();
  }, [user, profile]);

  const handleJoin = async () => {
    if (!user || !inviteFound) return;
    setLoading(true);
    try {
      const newUserProfile = {
        id: user.uid,
        tenant_id: inviteFound.tenant_id,
        name: inviteFound.name || user.displayName || 'Staff',
        email: user.email,
        role: inviteFound.role || 'sales_rep',
        is_active: true,
        created_at: serverTimestamp()
      };
      await setDoc(doc(db, 'users', user.uid), newUserProfile);
      await deleteDoc(doc(db, 'invitations', inviteFound.id));
      navigate('/');
    } catch (err: any) {
      console.error("Join failed:", err);
      alert(`Join failed: ${err.message || 'Unknown error. Please check permissions.'}`);
    } finally {
      setLoading(false);
    }
  };

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
        {inviteFound ? (
          <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserPlus size={32} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800">You're Invited!</h2>
              <p className="text-sm text-slate-500 font-medium">
                You have been invited to join an organization on BillKaro.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Organization Invitation</p>
              <p className="text-lg font-bold text-slate-800">{inviteFound.name || 'Your Team'}</p>
              <p className="text-xs text-slate-500">{inviteFound.email}</p>
            </div>

            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Accept & Join Studio'}
            </button>

            <button 
              onClick={() => setInviteFound(null)}
              className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              I want to create a new company instead
            </button>
          </div>
        ) : (
          <>
            <div className="text-center space-y-3">
              <div className="w-10 h-10 bg-slate-100 text-primary rounded-xl flex items-center justify-center mx-auto">
                <PlusCircle size={24} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800">New Workspace</h2>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">
                {checkingInvite ? 'Checking for invitations...' : 'Initialization Required'}
              </p>
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
                disabled={loading || checkingInvite}
                className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all disabled:opacity-50"
              >
                {loading ? 'Initializing...' : 'Create Studio'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
