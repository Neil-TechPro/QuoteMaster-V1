import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Building2, Package, CreditCard, ShieldCheck, Plus, Trash2, Edit2, Loader2, Save, X, Activity, Users } from 'lucide-react';
import { cn } from '../lib/utils';

type SettingsTab = 'company' | 'products' | 'finance' | 'team';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'client_admin' | 'sales_rep';
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  hsn_code: string;
  unit: string;
  default_price: number;
  default_gst_rate: number;
  is_active: boolean;
}

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export function Settings() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tenant State
  const [tenant, setTenant] = useState<any>(null);

  // Team State
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'sales_rep' as 'client_admin' | 'sales_rep'
  });

  // Product State
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    hsn_code: '',
    unit: 'Pcs',
    default_price: 0,
    default_gst_rate: 18,
    is_active: true
  });

  useEffect(() => {
    if (!profile?.tenant_id) return;

    // Fetch Tenant
    const fetchTenant = async () => {
      const snap = await getDoc(doc(db, 'tenants', profile.tenant_id!));
      if (snap.exists()) setTenant(snap.data());
      setLoading(false);
    };
    fetchTenant();

    // Sync Products
    const q = query(collection(db, 'products'), where('tenant_id', '==', profile.tenant_id));
    const unsubProducts = onSnapshot(q, (s) => {
      setProducts(s.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (error) => {
      console.error("Products snapshot error:", error);
    });

    // Sync Team
    let unsubTeam = () => {};
    if (profile?.role === 'client_admin' || profile?.role === 'super_admin') {
      const qTeam = query(collection(db, 'users'), where('tenant_id', '==', profile.tenant_id));
      unsubTeam = onSnapshot(qTeam, (s) => {
        setTeam(s.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
      }, (error) => {
        console.error("Team snapshot error:", error);
      });
    }

    // Sync Invitations
    let unsubInv = () => {};
    if (profile?.role === 'client_admin' || profile?.role === 'super_admin') {
      const qInv = query(collection(db, 'invitations'), where('tenant_id', '==', profile.tenant_id));
      unsubInv = onSnapshot(qInv, (s) => {
        setInvitations(s.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        console.error("Invitations snapshot error:", error);
      });
    }

    return () => {
      unsubProducts();
      unsubTeam();
      unsubInv();
    };
  }, [profile?.tenant_id, profile?.role]);

  const handleTenantSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'tenants', profile.tenant_id), {
        ...tenant,
        updated_at: serverTimestamp()
      });
      alert('Settings saved successfully');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setSaving(true);
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct), productForm);
      } else {
        await addDoc(collection(db, 'products'), {
          ...productForm,
          tenant_id: profile.tenant_id,
          created_at: serverTimestamp()
        });
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleProductStatus = async (p: Product) => {
    await updateDoc(doc(db, 'products', p.id), { is_active: !p.is_active });
  };

  const deleteProduct = async (id: string) => {
    if (confirm('Delete this product?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const handleUserInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'invitations'), {
        email: userForm.email.toLowerCase(),
        name: userForm.name,
        role: userForm.role,
        tenant_id: profile.tenant_id,
        invited_by: profile.id,
        created_at: serverTimestamp()
      });
      alert(`Invitation sent to ${userForm.email}`);
      setIsUserModalOpen(false);
      setUserForm({ name: '', email: '', role: 'sales_rep' });
    } catch (err) {
      console.error(err);
      alert('Error sending invitation');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserStatus = async (user: UserProfile) => {
    if (user.id === profile.id) return alert("You cannot deactivate yourself.");
    await updateDoc(doc(db, 'users', user.id), { is_active: !user.is_active });
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-4xl font-black text-slate-800 tracking-tight">Studio Settings</h2>
        <p className="text-muted font-bold uppercase tracking-widest text-[10px] mt-1">Configure your master catalogue & rules</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {[
          { id: 'company' as SettingsTab, label: 'Company Profile', icon: Building2 },
          { id: 'team' as SettingsTab, label: 'Team', icon: Users },
          { id: 'products' as SettingsTab, label: 'Products', icon: Package },
          { id: 'finance' as SettingsTab, label: 'Finance & Bank', icon: CreditCard },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all",
              activeTab === tab.id ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="max-w-5xl">
        {activeTab === 'company' && (
          <form onSubmit={handleTenantSave} className="space-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Name</label>
                  <input
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold"
                    value={tenant?.company_name || ''}
                    onChange={e => setTenant({...tenant, company_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                  <input
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold"
                    value={tenant?.email || ''}
                    onChange={e => setTenant({...tenant, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Contact</label>
                  <input
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold"
                    value={tenant?.phone || ''}
                    onChange={e => setTenant({...tenant, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GSTIN</label>
                  <input
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold"
                    value={tenant?.gstin || ''}
                    onChange={e => setTenant({...tenant, gstin: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base State</label>
                  <select
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold"
                    value={tenant?.state || ''}
                    onChange={e => setTenant({...tenant, state: e.target.value})}
                  >
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Address</label>
                  <textarea
                    className="w-full bg-slate-50 border-none rounded-xl p-4 focus:ring-1 focus:ring-primary text-sm font-bold min-h-[100px]"
                    value={tenant?.address || ''}
                    onChange={e => setTenant({...tenant, address: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-50 flex justify-end">
              <button disabled={saving} className="h-12 px-8 bg-primary text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/10 hover:bg-blue-800 transition-all flex items-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Save Changes
              </button>
            </div>
          </form>
        )}

        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-primary rounded-2xl flex items-center justify-center">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Team Management</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{team.length} Active Members</p>
                </div>
              </div>
              <button 
                onClick={() => setIsUserModalOpen(true)}
                className="bg-primary text-white h-12 px-6 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-blue-800 transition-all"
              >
                <Plus size={18} />
                <span>Invite Member</span>
              </button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {team.map(user => (
                    <tr key={user.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5 font-bold text-slate-800">{user.name}</td>
                      <td className="px-8 py-5 text-sm font-medium text-slate-500">{user.email}</td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black uppercase text-slate-400 border border-slate-200 px-2 py-0.5 rounded-md">
                          {user.role === 'client_admin' ? 'Admin' : 'Sales Rep'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <button 
                          onClick={() => toggleUserStatus(user)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                            user.is_active ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          )}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-primary text-xs tracking-widest">
                        {user.id === profile.id && "YOU"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invitations.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4">
                  <Activity size={16} className="text-amber-500" />
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Pending Invitations</h4>
                </div>
                <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-slate-50">
                      {invitations.map(inv => (
                        <tr key={inv.id} className="group hover:bg-slate-50 transition-colors text-sm">
                          <td className="px-8 py-4 font-bold text-slate-800">{inv.name}</td>
                          <td className="px-8 py-4 text-slate-500">{inv.email}</td>
                          <td className="px-8 py-4">
                            <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">
                              Pending
                            </span>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <button 
                              onClick={async () => {
                                if (confirm('Cancel this invitation?')) {
                                  await deleteDoc(doc(db, 'invitations', inv.id));
                                }
                              }}
                              className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-primary rounded-2xl flex items-center justify-center">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Product Catalogue</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{products.length} Items Listed</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setEditingProduct(null);
                  setProductForm({ name: '', hsn_code: '', unit: 'Pcs', default_price: 0, default_gst_rate: 18, is_active: true });
                  setIsProductModalOpen(true);
                }}
                className="bg-primary text-white h-12 px-6 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-blue-800"
              >
                <Plus size={18} />
                <span>New Item</span>
              </button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name / HSN</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Price / Tax</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {products.map(p => (
                    <tr key={p.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-800">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{p.hsn_code}</p>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-500">{p.unit}</td>
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-800">${p.default_price.toLocaleString()}</p>
                        <p className="text-[10px] text-indigo-500 font-bold uppercase">{p.default_gst_rate}% GST</p>
                      </td>
                      <td className="px-8 py-5">
                        <button 
                          onClick={() => toggleProductStatus(p)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                            p.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                          )}
                        >
                          {p.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingProduct(p.id);
                              setProductForm({ ...p });
                              setIsProductModalOpen(true);
                            }}
                            className="p-2 text-slate-300 hover:text-primary transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => deleteProduct(p.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <form onSubmit={handleTenantSave} className="space-y-8">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <CreditCard className="text-primary" size={20} />
                  Banking Configuration
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Details will appear on all PDFs</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Name</label>
                    <input
                      className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold"
                      value={tenant?.bank_details?.bank_name || ''}
                      onChange={e => setTenant({...tenant, bank_details: { ...tenant.bank_details, bank_name: e.target.value }})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Number</label>
                    <input
                      className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold"
                      value={tenant?.bank_details?.account_number || ''}
                      onChange={e => setTenant({...tenant, bank_details: { ...tenant.bank_details, account_number: e.target.value }})}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IFSC Code</label>
                    <input
                      className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold"
                      value={tenant?.bank_details?.ifsc || ''}
                      onChange={e => setTenant({...tenant, bank_details: { ...tenant.bank_details, ifsc: e.target.value }})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch Name</label>
                    <input
                      className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold"
                      value={tenant?.bank_details?.branch || ''}
                      onChange={e => setTenant({...tenant, bank_details: { ...tenant.bank_details, branch: e.target.value }})}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <ShieldCheck className="text-primary" size={20} />
                  Terms & Conditions
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Mandatory footer for all documents</p>
              </div>
              <textarea
                className="w-full bg-slate-50 border-none rounded-2xl p-6 focus:ring-1 focus:ring-primary text-sm font-bold min-h-[150px]"
                placeholder="1. All sales are final... 2. Interest charged at 24% for delayed payments..."
                value={tenant?.terms_conditions || ''}
                onChange={e => setTenant({...tenant, terms_conditions: e.target.value})}
              />
              <div className="pt-6 border-t border-slate-50 flex justify-end">
                <button disabled={saving} className="h-12 px-8 bg-primary text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/10 hover:bg-blue-800 transition-all flex items-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save All Finance Data
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                {editingProduct ? 'Update Item' : 'New Catalogue Item'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-800">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleProductSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Name</label>
                  <input
                    required
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold"
                    value={productForm.name}
                    onChange={e => setProductForm({...productForm, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HSN Code</label>
                    <input
                      className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold"
                      value={productForm.hsn_code}
                      onChange={e => setProductForm({...productForm, hsn_code: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</label>
                    <select
                      className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold"
                      value={productForm.unit}
                      onChange={e => setProductForm({...productForm, unit: e.target.value})}
                    >
                      {['Pcs', 'Kg', 'Box', 'Meter', 'Service'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Default Price</label>
                    <input
                      type="number"
                      className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold"
                      value={productForm.default_price}
                      onChange={e => setProductForm({...productForm, default_price: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GST Rate (%)</label>
                    <select
                      className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold"
                      value={productForm.default_gst_rate}
                      onChange={e => setProductForm({...productForm, default_gst_rate: Number(e.target.value)})}
                    >
                      {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="submit" disabled={saving} className="flex-1 h-12 bg-primary text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/10 hover:bg-blue-800 transition-all flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : (editingProduct ? 'Update Item' : 'Save Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Invitation Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Invite Team Member</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-800">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUserInvite} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Name</label>
                  <input
                    required
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                    placeholder="e.g. John Doe"
                    value={userForm.name}
                    onChange={e => setUserForm({...userForm, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                    placeholder="john@example.com"
                    value={userForm.email}
                    onChange={e => setUserForm({...userForm, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Role</label>
                  <select
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                    value={userForm.role}
                    onChange={e => setUserForm({...userForm, role: e.target.value as any})}
                  >
                    <option value="sales_rep">Sales Representative</option>
                    <option value="client_admin">Store Admin</option>
                  </select>
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={saving} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/10 hover:bg-blue-800 transition-all flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
