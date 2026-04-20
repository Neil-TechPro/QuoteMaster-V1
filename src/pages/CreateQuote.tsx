import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, runTransaction, query, where, getDocs } from 'firebase/firestore';
import { Plus, Trash2, Send, Save, ArrowLeft, Loader2, Calendar, Search, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths } from 'date-fns';
import { generateInvoicePDF } from '../services/pdfService';
import { cn } from '../lib/utils';

interface LineItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  lineTotal: number;
  hsnCode?: string;
  unit?: string;
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

const GST_RATES = [0, 5, 12, 18, 28];

export function CreateQuote() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  // Search/Selection state
  const [showClientList, setShowClientList] = useState(false);
  const [activeProductSearch, setActiveProductSearch] = useState<string | null>(null);

  // Quote Header State
// ... line 39 ...
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientGstin, setClientGstin] = useState('');
  const [clientState, setClientState] = useState('Gujarat');
  const [quoteDate, setQuoteDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [validUntil, setValidUntil] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  
  // Line Items State
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', productName: '', quantity: 1, unitPrice: 0, gstRate: 18, lineTotal: 0 }
  ]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (profile?.tenant_id) {
      getDoc(doc(db, 'tenants', profile.tenant_id)).then(ds => {
        if (ds.exists()) {
          setTenantInfo(ds.data());
          if (ds.data().state) setClientState(ds.data().state);
        }
      });

      // Fetch Catalogues
      const qp = query(collection(db, 'products'), where('tenant_id', '==', profile.tenant_id), where('is_active', '==', true));
      getDocs(qp).then(s => setProducts(s.docs.map(d => ({id: d.id, ...d.data()}))));

      const qc = query(collection(db, 'clients'), where('tenant_id', '==', profile.tenant_id));
      getDocs(qc).then(s => setClients(s.docs.map(d => ({id: d.id, ...d.data()}))));
    }
  }, [profile?.tenant_id]);

  const selectClient = (c: any) => {
    setClientName(c.name);
    setClientPhone(c.phone || '');
    setClientAddress(c.address || '');
    setClientGstin(c.gstin || '');
    setClientState(c.state || 'Gujarat');
    setShowClientList(false);
  };

  const selectProduct = (itemId: string, p: any) => {
    updateItem(itemId, {
      productName: p.name,
      unitPrice: p.default_price || 0,
      gstRate: p.default_gst_rate || 18,
      hsnCode: p.hsn_code || '',
      unit: p.unit || 'Pcs'
    });
    setActiveProductSearch(null);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const isIntraState = tenantInfo?.state === clientState;

    items.forEach(item => {
      const lineSubtotal = item.quantity * item.unitPrice;
      subtotal += lineSubtotal;
      
      const taxAmount = (lineSubtotal * item.gstRate) / 100;
      if (isIntraState) {
        cgst += taxAmount / 2;
        sgst += taxAmount / 2;
      } else {
        igst += taxAmount;
      }
    });

    return {
      subtotal,
      cgst,
      sgst,
      igst,
      totalTax: cgst + sgst + igst,
      grandTotal: subtotal + cgst + sgst + igst
    };
  };

  const updateItem = (id: string, updates: Partial<LineItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newItem = { ...item, ...updates };
      newItem.lineTotal = newItem.quantity * newItem.unitPrice;
      return newItem;
    }));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      productName: '',
      quantity: 1,
      unitPrice: 0,
      gstRate: 18,
      lineTotal: 0
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCreate = async (shouldSend = false) => {
    if (!profile?.tenant_id || !clientName) return alert('Please enter a client name.');
    
    setLoading(true);
    try {
      const totals = calculateTotals();
      const tenantRef = doc(db, 'tenants', profile.tenant_id);
      
      const quotationNumber = await runTransaction(db, async (transaction) => {
        const tenantSnapshot = await transaction.get(tenantRef);
        if (!tenantSnapshot.exists()) throw new Error("Tenant does not exist!");
        
        const currentCounter = tenantSnapshot.data().quotation_counter || 1;
        const prefix = tenantSnapshot.data().quotation_prefix || 'QT-2026-';
        const formattedCounter = currentCounter.toString().padStart(4, '0');
        const quoteNum = `${prefix}${formattedCounter}`;
        
        transaction.update(tenantRef, {
          quotation_counter: currentCounter + 1
        });
        
        return quoteNum;
      });

      const quoteData = {
        tenant_id: profile.tenant_id,
        quotation_number: quotationNumber,
        client: {
          name: clientName,
          phone: clientPhone,
          address: clientAddress,
          gstin: clientGstin,
          state: clientState
        },
        sales_rep_id: profile.id,
        date: new Date(quoteDate),
        valid_until: new Date(validUntil),
        subtotal: totals.subtotal,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        grand_total: totals.grandTotal,
        status: 'draft',
        notes,
        items: items.map(({ id, ...rest }) => rest)
      };

      await addDoc(collection(db, 'quotations'), quoteData);

      if (shouldSend) {
        const pdf = generateInvoicePDF({
          tenant: tenantInfo,
          client: quoteData.client,
          items: items,
          summary: { 
            subtotal: totals.subtotal, 
            cgst: totals.cgst, 
            sgst: totals.sgst, 
            igst: totals.igst,
            total: totals.grandTotal 
          },
          docInfo: { 
            number: quotationNumber, 
            date: new Date(quoteDate), 
            validUntil: new Date(validUntil) 
          }
        });
        pdf.save(`${quotationNumber}.pdf`);
      }

      navigate('/');
    } catch (error) {
      console.error("Create quote error:", error);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-8 pb-32">
      <header className="sticky top-0 z-40 bg-background-light/80 backdrop-blur-md py-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/')} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-sm">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Drafting Quotation</h1>
            <p className="text-[10px] font-black text-muted uppercase tracking-widest mt-0.5">Professional Billing</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="bg-white rounded-3xl shadow-sm p-10 border border-slate-200 overflow-hidden relative">
          {/* Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-primary"></div>

          {/* Client Details Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 pb-10 border-b border-slate-100">
            <div className="space-y-6">
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Name</label>
                <div className="relative">
                  <input
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-lg font-bold text-slate-800 placeholder-slate-200"
                    placeholder="Search or enter name..."
                    value={clientName}
                    onFocus={() => setShowClientList(true)}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                  {showClientList && clients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto overflow-x-hidden">
                      {clients.filter(c => c.name.toLowerCase().includes(clientName.toLowerCase())).map(c => (
                        <button
                          key={c.id}
                          onClick={() => selectClient(c)}
                          className="w-full text-left px-5 py-3 hover:bg-slate-50 font-bold text-sm text-slate-700 transition-colors flex items-center justify-between"
                        >
                          <span>{c.name}</span>
                          <span className="text-[10px] text-slate-300 font-black uppercase">{c.state}</span>
                        </button>
                      ))}
                      <button 
                        onClick={() => setShowClientList(false)}
                        className="w-full text-center py-2 text-[10px] font-bold text-slate-300 uppercase hover:text-slate-500 border-t border-slate-50"
                      >
                        Close Lists
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                <input
                  className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                  placeholder="+91 00000 00000"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Address</label>
                <textarea
                  className="w-full bg-slate-50 border-none rounded-xl p-4 focus:ring-1 focus:ring-primary text-sm font-medium text-slate-800 min-h-[80px]"
                  placeholder="Walk-in, Main Street..."
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quote Date</label>
                  <input
                    type="date"
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                    value={quoteDate}
                    onChange={(e) => setQuoteDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valid Until</label>
                  <input
                    type="date"
                    className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GSTIN (Optional)</label>
                <input
                  className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800 placeholder-slate-200"
                  placeholder="24AAAAA0000A1Z5"
                  value={clientGstin}
                  onChange={(e) => setClientGstin(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Place of Supply (State)</label>
                <select
                  value={clientState}
                  onChange={(e) => setClientState(e.target.value)}
                  className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                >
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Line Items Table */}
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4 pb-3 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <div className="col-span-12 md:col-span-5">Product Description</div>
              <div className="col-span-3 md:col-span-1 text-right">Qty</div>
              <div className="col-span-3 md:col-span-2 text-right">Unit Rate</div>
              <div className="col-span-3 md:col-span-2 text-right">GST %</div>
              <div className="col-span-3 md:col-span-2 text-right">Amount</div>
            </div>

            {items.map((item) => (
              <div key={item.id} className="group grid grid-cols-12 gap-4 items-center py-1 relative">
                <div className="col-span-12 md:col-span-5 relative">
                  <input
                    className="w-full bg-slate-50 border-none rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800 placeholder-slate-300"
                    placeholder="e.g. Steel Pipe 40mm"
                    value={item.productName}
                    onFocus={() => setActiveProductSearch(item.id)}
                    onChange={(e) => updateItem(item.id, { productName: e.target.value })}
                  />
                  {activeProductSearch === item.id && products.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto">
                      {products.filter(p => p.name.toLowerCase().includes(item.productName.toLowerCase())).map(p => (
                        <button
                          key={p.id}
                          onClick={() => selectProduct(item.id, p)}
                          className="w-full text-left px-5 py-3 hover:bg-slate-50 font-bold text-sm text-slate-700 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p>{p.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase">{p.hsn_code}</p>
                          </div>
                          <p className="text-primary">${p.default_price}</p>
                        </button>
                      ))}
                      <button 
                        onClick={() => setActiveProductSearch(null)}
                        className="w-full text-center py-2 text-[10px] font-bold text-slate-300 uppercase border-t border-slate-50"
                      >
                        Custom Entry
                      </button>
                    </div>
                  )}
                </div>
                <div className="col-span-3 md:col-span-1">
                  <input
                    type="number"
                    className="w-full text-right bg-slate-50 border-none rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
                <div className="col-span-3 md:col-span-2">
                  <input
                    type="number"
                    className="w-full text-right bg-slate-50 border-none rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, { unitPrice: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
                <div className="col-span-3 md:col-span-2 text-right">
                  <select
                    className="w-full text-right bg-slate-50 border-none rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm font-bold text-slate-800"
                    value={item.gstRate}
                    onChange={(e) => updateItem(item.id, { gstRate: Number(e.target.value) })}
                  >
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div className="col-span-3 md:col-span-2 text-right p-3 font-black text-slate-800 text-sm truncate">
                  ${item.lineTotal.toLocaleString()}
                </div>
                <button 
                  onClick={() => removeItem(item.id)}
                  className="absolute -right-8 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-rose-500 hover:bg-rose-50 rounded-lg hidden md:block"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <button 
              onClick={addItem}
              className="mt-6 flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 px-4 py-2 rounded-lg transition-all"
            >
              <Plus size={14} />
              <span>Add Item</span>
            </button>
          </div>

          {/* Totals Section */}
          <div className="flex flex-col md:flex-row justify-between items-start mt-12 pt-10 border-t border-slate-100 gap-12">
            <div className="w-full md:w-1/2">
              <textarea
                className="w-full bg-slate-50 border-none rounded-2xl p-6 focus:ring-1 focus:ring-primary text-sm font-medium text-slate-800 min-h-[120px] placeholder-slate-400"
                placeholder="Notes / Terms (Special packing instructions, transport, etc...)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-1/2 space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Subtotal</span>
                <span className="text-slate-800">${totals.subtotal.toLocaleString()}.00</span>
              </div>
              
              {tenantInfo?.state === clientState ? (
                <>
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>CGST (Intra-state)</span>
                    <span className="text-slate-800">${totals.cgst.toLocaleString()}.00</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>SGST (Intra-state)</span>
                    <span className="text-slate-800">${totals.sgst.toLocaleString()}.00</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>IGST (Inter-state)</span>
                  <span className="text-slate-800">${totals.igst.toLocaleString()}.00</span>
                </div>
              )}

              <div className="flex justify-between items-end mt-6 pt-6 border-t-2 border-slate-900">
                <span className="text-base font-black text-slate-800 tracking-tight">Total Amount Due</span>
                <span className="text-4xl font-black tracking-tighter text-primary leading-none">
                  ${totals.grandTotal.toLocaleString()}.00
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-50">
          <div className="bg-slate-900 rounded-3xl p-4 flex items-center gap-4 shadow-2xl border border-slate-800">
            <button 
              onClick={() => handleCreate(false)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 h-12 bg-slate-800 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              <span>Draft</span>
            </button>
            <button 
              onClick={() => handleCreate(true)}
              disabled={loading}
              className="flex-[2] flex items-center justify-center gap-2 h-12 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-800 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
               {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              <span>Send & Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
