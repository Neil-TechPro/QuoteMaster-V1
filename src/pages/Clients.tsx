import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Plus, Search, Mail, Phone, MapPin, Trash2, Edit2, Loader2, UserPlus, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  state?: string;
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

export function Clients() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    state: 'Gujarat'
  });

  useEffect(() => {
    if (!profile?.tenant_id) return;

    const q = query(
      collection(db, 'clients'),
      where('tenant_id', '==', profile.tenant_id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(docs);
      setLoading(false);
    }, (error) => {
      console.error("Clients snapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.tenant_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    setSubmitting(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'clients', editingId), {
          ...formData,
          updated_at: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'clients'), {
          ...formData,
          tenant_id: profile.tenant_id,
          created_at: serverTimestamp()
        });
      }
      closeModal();
    } catch (error) {
      console.error("Client op failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const openModal = (client?: Client) => {
    if (client) {
      setEditingId(client.id);
      setFormData({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        gstin: client.gstin || '',
        state: client.state || 'Gujarat'
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', email: '', phone: '', address: '', gstin: '', state: 'Gujarat' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Clients</h2>
          <p className="text-muted font-bold uppercase tracking-widest text-[10px] mt-1">Directory of buyers</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-primary text-white h-12 px-6 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/10"
        >
          <UserPlus size={18} />
          <span>Add Client</span>
        </button>
      </header>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
        <input 
          type="text"
          placeholder="Search by name or email..."
          className="w-full h-14 bg-white border border-slate-200 rounded-[2rem] pl-12 pr-6 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-slate-800 font-bold placeholder-slate-300 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xl">
                    {client.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openModal(client)}
                      className="p-2 text-slate-300 hover:text-primary transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => deleteClient(client.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">{client.name}</h3>
                  <div className="space-y-2">
                    {client.email && (
                      <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                        <Mail size={14} className="text-slate-300" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                        <Phone size={14} className="text-slate-300" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start gap-3 text-slate-500 text-sm font-medium">
                        <MapPin size={14} className="text-slate-300 mt-1 shrink-0" />
                        <span className="line-clamp-2">{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{client.state}</span>
                <span className="text-[10px] font-black text-primary border border-primary-light px-2 py-0.5 rounded-md uppercase tracking-widest">
                  {client.gstin ? 'GST Registered' : 'Unregistered'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-20 text-center space-y-6 border border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
            <UserPlus size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-800">No clients found</h3>
            <p className="text-slate-400 font-medium max-w-xs mx-auto">Start by adding your first buyer or searching for a different name.</p>
          </div>
          <button 
            onClick={() => openModal()}
            className="text-primary font-bold hover:underline"
          >
            Add your first client
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                {editingId ? 'Edit Client' : 'New Client'}
              </h3>
              <button onClick={closeModal} className="p-2 text-slate-300 hover:text-slate-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client / Company Name</label>
                <input
                  required
                  className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                  <input
                    type="email"
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                  <input
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Address</label>
                <textarea
                  className="w-full bg-slate-50 border-none rounded-xl p-4 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800 min-h-[100px]"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">State (Place of Supply)</label>
                  <select
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                  >
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GSTIN (Optional)</label>
                  <input
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                    value={formData.gstin}
                    onChange={(e) => setFormData({...formData, gstin: e.target.value.toUpperCase()})}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 h-12 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] h-12 bg-primary text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/10 hover:bg-blue-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : (editingId ? 'Update Client' : 'Save Client')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
