import React, { useState, useEffect, useCallback } from 'react';
import Connector from '../../../../services/Connector';
import {
  Plus, Search, Eye, Loader2, X, CheckCircle, AlertCircle,
  Trash2, Send, Download, CreditCard, RefreshCw,
} from 'lucide-react';
import {
  listBmsInvoicesApi, createBmsInvoiceApi, getBmsInvoiceByIdApi,
  sendBmsInvoiceApi, downloadBmsInvoicePdf,
  listBmsGstRatesApi,
  listBmsParticularsApi,
  createBmsPaymentApi, listBmsPaymentModesApi,
  listBmsClientsApi,
  createBmsClientApi,
} from '../../../../services/repository/Manager/BmsRepo';
import Apis from '../../../../services/Apis';

// ─── Raut local API helpers ──────────────────────────────────
const RAUT_BASE = import.meta.env.VITE_API_BASE_URL;
const rautAuth  = () => ({ Authorization: `Bearer ${localStorage.getItem('raut_token')}` });

// ─── helpers ───────────────────────────────────────────────
const todayStr      = () => new Date().toISOString().split('T')[0];
const futureDateStr = (days = 30) => {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};
const fmtCurrency = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v || 0);
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

// ─── constants ────────────────────────────────────────────
const EMPTY_ITEM = { particular_id: '', description: '', quantity: 1, unit_price: 0, tax_rate_id: '', discount_percentage: 0 };
const EMPTY_INVOICE_FORM = {
  client_id: '', invoice_date: todayStr(), due_date: futureDateStr(30),
  notes: '', terms_conditions: '', discount_amount: 0, items: [{ ...EMPTY_ITEM }],
};
const EMPTY_CLIENT_FORM = {
  client_code: '', client_name: '', email: '', phone: '',
  billing_address: '', gstin: '', pan: '', payment_terms_days: 30, credit_limit: 0,
};
const EMPTY_SEND_FORM    = { email: '', send_copy_to: '', message: '' };
const EMPTY_PAYMENT_FORM = { amount: '', payment_date: todayStr(), payment_mode_id: '', reference_number: '', notes: '' };

const STATUS_BADGE = {
  DRAFT:     'bg-gray-700 text-gray-200',
  SENT:      'bg-blue-900 text-blue-200',
  PAID:      'bg-green-900 text-green-200',
  PARTIAL:   'bg-yellow-900 text-yellow-200',
  OVERDUE:   'bg-red-900 text-red-200',
  CANCELLED: 'bg-red-950 text-red-400',
};

// ─── shared ui ────────────────────────────────────────────
const Toast = ({ msg, type, onClose }) => (
  <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium
    ${type === 'success' ? 'bg-gray-900 border-green-600 text-green-400' : 'bg-gray-900 border-red-600 text-red-400'}`}>
    {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
    <span>{msg}</span>
    <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={15} /></button>
  </div>
);

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inp = 'w-full px-3.5 py-2.5 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 text-sm placeholder-gray-500 transition';
const sel = inp + ' appearance-none cursor-pointer';

const ModalWrapper = ({ onClose, children, maxW = 'max-w-2xl' }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
    <div className={`bg-gray-900 border border-gray-800 rounded-2xl w-full ${maxW} shadow-2xl`}>
      {children}
    </div>
  </div>
);

const ModalHeader = ({ title, onClose }) => (
  <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
    <h2 className="text-lg font-bold text-white">{title}</h2>
    <button onClick={onClose} className="text-gray-500 hover:text-white transition"><X size={20} /></button>
  </div>
);

// ─── main component ───────────────────────────────────────
export default function BmsInvoices() {
  const [clients, setClients]         = useState([]);
  const [gstRates, setGstRates]       = useState([]);
  const [particulars, setParticulars] = useState([]);
  const [payModes, setPayModes]       = useState([]);
  const [masterLoading, setMasterLoading] = useState(true);

  // Get auth token to ensure we only load after auth is ready
  const token = localStorage.getItem('raut_token');

  const [invoices, setInvoices]         = useState([]);
  const [listLoading, setListLoading]   = useState(false);
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showInvoiceForm, setShowInvoiceForm]   = useState(false);
  const [showClientForm, setShowClientForm]     = useState(false);
  const [showViewModal, setShowViewModal]       = useState(false);
  const [showSendModal, setShowSendModal]       = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE_FORM);
  const [clientForm, setClientForm]   = useState(EMPTY_CLIENT_FORM);
  const [sendForm, setSendForm]       = useState(EMPTY_SEND_FORM);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [creating, setCreating]             = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [sending, setSending]               = useState(false);
  const [paying, setPaying]                 = useState(false);
  const [downloading, setDownloading]       = useState(null);

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── load master data ─────────────────────────────────────
  const loadMasters = useCallback(async () => {
    setMasterLoading(true);
    try {
      const [cRes, gRes, pRes, mRes] = await Promise.allSettled([
        listBmsClientsApi({ limit: 200 }),
        listBmsGstRatesApi(),
        listBmsParticularsApi(),
        listBmsPaymentModesApi(),
      ]);

      if (cRes.status === 'fulfilled') {
        const d = cRes.value.data?.data;
        let list = Array.isArray(d) ? d : [];
        if (!list.length && d?.data && Array.isArray(d.data)) list = d.data;
        setClients(list);
      }
      if (gRes.status === 'fulfilled') {
        const d = gRes.value.data?.data;
        setGstRates(Array.isArray(d) ? d : []);
      }
      if (pRes.status === 'fulfilled') {
        const d = pRes.value.data?.data;
        const list = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
        setParticulars(list);
      }
      if (mRes.status === 'fulfilled') {
        const d = mRes.value.data?.data;
        setPayModes(Array.isArray(d) ? d : []);
      }
    } catch (_) {}
    finally { setMasterLoading(false); }
  }, []);

  // ── load invoices ───────────────────────────────────────
  const loadInvoices = useCallback(async () => {
    setListLoading(true);
    try {
      const params = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await listBmsInvoicesApi(params);
      if (res.data.success) {
        const d = res.data.data;
        const list = Array.isArray(d) ? d
                   : Array.isArray(d?.data) ? d.data
                   : [];
        setInvoices(list);
      }
    } catch (_) {}
    finally { setListLoading(false); }
  }, [statusFilter]);

  // Only load master data once authentication is ready
  useEffect(() => {
    if (token) {
      loadMasters();
    }
  }, [token]);
  
  useEffect(() => { loadInvoices(); }, [statusFilter]);

  // ── invoice form helpers ─────────────────────────────────
  const setInvField  = (k, v)      => setInvoiceForm(f => ({ ...f, [k]: v }));
  const setItemField = (idx, k, v) => setInvoiceForm(f => ({
    ...f, items: f.items.map((it, i) => i === idx ? { ...it, [k]: v } : it),
  }));

  const onParticularSelect = (idx, pid) => {
    if (!pid) { setItemField(idx, 'particular_id', ''); return; }

    // BMS Particulars
    const bmsP = particulars.find(x => String(x.particular_id) === String(pid));
    if (bmsP) {
      setInvoiceForm(f => ({
        ...f, items: f.items.map((it, i) => i === idx ? {
          ...it, particular_id: pid,
          description: bmsP.name,
          unit_price:  bmsP.default_rate || bmsP.rate || 0,
        } : it),
      }));
      return;
    }
  };

  const addItem    = ()    => setInvoiceForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (idx) => setInvoiceForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const lineTotal  = (it) => {
    const base = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0);
    return base - base * ((parseFloat(it.discount_percentage) || 0) / 100);
  };
  const subtotal   = invoiceForm.items.reduce((s, it) => s + lineTotal(it), 0);
  const grandTotal = subtotal - (parseFloat(invoiceForm.discount_amount) || 0);

  // ── CREATE INVOICE ───────────────────────────────────────
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceForm.client_id) return showToast('Select a client.', 'error');
    if (invoiceForm.items.some(it => !it.description || !it.unit_price))
      return showToast('Fill description and unit price for all items.', 'error');
    setCreating(true);
    try {
      const selClient = clients.find(c => String(c.client_id) === String(invoiceForm.client_id));
      const payload = {
        is_client_master_linked: false,
        is_particulars_master_linked: false,
        client_name:               selClient?.client_name || 'Unknown Client',
        client_email:              selClient?.email || '',
        client_phone:              selClient?.phone || '',
        client_gstin:              selClient?.gstin || '',
        client_pan:                selClient?.pan || '',
        client_address:            selClient?.billing_address || '',
        invoice_date:              invoiceForm.invoice_date,
        due_date:                  invoiceForm.due_date,
        notes:                     invoiceForm.notes || null,
        terms_conditions:          invoiceForm.terms_conditions || null,
        discount_amount:           parseFloat(invoiceForm.discount_amount) || 0,
        items: invoiceForm.items.map(it => ({
          ...(it.tax_rate_id ? { tax_rate_id: parseInt(it.tax_rate_id, 10) } : {}),
          description:         it.description,
          item_name:           it.description,
          quantity:            parseFloat(it.quantity) || 1,
          unit_price:          parseFloat(it.unit_price) || 0.01,
          discount_percentage: parseFloat(it.discount_percentage) || 0,
        })),
      };
      const res = await createBmsInvoiceApi(payload);
      if (res.data.success) {
        const created = res.data.data?.data || res.data.data;
        setInvoices(prev => [created, ...prev]);
        setShowInvoiceForm(false);
        setInvoiceForm(EMPTY_INVOICE_FORM);
        showToast(`Invoice ${created?.invoice_number} created!`);
      } else { showToast(res.data.message || 'Failed.', 'error'); }
    } catch (err) { showToast(err.response?.data?.message || 'Error.', 'error'); }
    finally { setCreating(false); }
  };

  // ── CREATE CLIENT (BMS) ──────────────────────────────────
  const handleCreateClient = async (e) => {
    e.preventDefault();
    setCreatingClient(true);
    try {
      const res = await createBmsClientApi({
        ...clientForm,
        client_code:        (clientForm.client_code || '').toUpperCase().trim(),
        payment_terms_days: parseInt(clientForm.payment_terms_days, 10) || 30,
        credit_limit:       parseFloat(clientForm.credit_limit) || 0,
      });
      if (res.data.success || res.data.data) {
        const c = res.data.data?.data || res.data.data;
        setClients(prev => [...prev, c]);
        setInvField('client_id', String(c.client_id || c.id));
        setShowClientForm(false);
        setClientForm(EMPTY_CLIENT_FORM);
        showToast(`Client "${c.client_name}" created!`);
      } else { showToast(res.data.message || 'Failed.', 'error'); }
    } catch (err) { showToast(err.response?.data?.message || 'Error.', 'error'); }
    finally { setCreatingClient(false); }
  };

  // ── VIEW ─────────────────────────────────────────────────
  const handleView = async (inv) => {
    try {
      const res = await getBmsInvoiceByIdApi(inv.invoice_id);
      if (res.data.success) {
        const invoice = res.data.data?.data || res.data.data;
        setSelectedInvoice(invoice);
        setShowViewModal(true);
      }
    } catch (_) { showToast('Failed to load invoice.', 'error'); }
  };

  // ── SEND ─────────────────────────────────────────────────
  const openSend = (inv) => {
    setSelectedInvoice(inv);
    setSendForm({ ...EMPTY_SEND_FORM, email: inv.client?.email || '' });
    setShowSendModal(true);
  };
  const handleSend = async (e) => {
    e.preventDefault();
    if (!sendForm.email) return showToast('Enter recipient email.', 'error');
    setSending(true);
    try {
      const res = await sendBmsInvoiceApi(selectedInvoice.invoice_id, {
        email:        sendForm.email.trim(),
        send_copy_to: sendForm.send_copy_to ? sendForm.send_copy_to.split(',').map(s => s.trim()).filter(Boolean) : [],
        message:      sendForm.message || null,
      });
      if (res.data.success) {
        setInvoices(prev => prev.map(i => i.invoice_id === selectedInvoice.invoice_id ? { ...i, status: 'SENT' } : i));
        setShowSendModal(false);
        showToast('Invoice sent!');
      } else { showToast(res.data.message || 'Failed.', 'error'); }
    } catch (err) { showToast(err.response?.data?.message || 'Error.', 'error'); }
    finally { setSending(false); }
  };

  // ── PAYMENT ──────────────────────────────────────────────
  const openPayment = (inv) => {
    setSelectedInvoice(inv);
    setPaymentForm({ ...EMPTY_PAYMENT_FORM, amount: inv.balance_amount || inv.total_amount || '' });
    setShowPaymentModal(true);
  };
  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount) return showToast('Enter amount.', 'error');
    setPaying(true);
    try {
      const res = await createBmsPaymentApi({
        invoice_id:       selectedInvoice.invoice_id,
        amount:           parseFloat(paymentForm.amount),
        payment_date:     paymentForm.payment_date,
        payment_mode_id:  paymentForm.payment_mode_id ? parseInt(paymentForm.payment_mode_id, 10) : undefined,
        reference_number: paymentForm.reference_number || null,
        notes:            paymentForm.notes || null,
      });
      if (res.data.success) { setShowPaymentModal(false); showToast('Payment recorded!'); loadInvoices(); }
      else { showToast(res.data.message || 'Failed.', 'error'); }
    } catch (err) { showToast(err.response?.data?.message || 'Error.', 'error'); }
    finally { setPaying(false); }
  };

  // ── DOWNLOAD PDF ─────────────────────────────────────────
  const handleDownload = async (inv) => {
    setDownloading(inv.invoice_id);
    try {
      const res = await downloadBmsInvoicePdf(inv.invoice_id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${inv.invoice_number}.pdf`; a.click();
      window.URL.revokeObjectURL(url);
    } catch (_) { showToast('Failed to download PDF.', 'error'); }
    finally { setDownloading(null); }
  };

  const filtered = invoices.filter(inv =>
    !searchTerm ||
    inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.client?.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">BMS Invoices</h1>
          <p className="text-gray-400 text-sm mt-1">Clients · Invoices · Payments — via BMS API</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadInvoices} disabled={listLoading} className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition disabled:opacity-50">
            <RefreshCw size={16} className={listLoading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowInvoiceForm(true)} disabled={masterLoading} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-sm transition disabled:opacity-50">
            <Plus size={18} /> Create Invoice
          </button>
        </div>
      </div>

      {masterLoading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-5">
          <Loader2 size={15} className="animate-spin" /> Loading clients, GST rates, particulars...
        </div>
      )}

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-3 text-gray-500" />
          <input type="text" placeholder="Search invoice number or client..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={inp + ' pl-10'} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={sel + ' w-44'}>
          <option value="">All Status</option>
          {['DRAFT','SENT','PAID','PARTIAL','OVERDUE','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-5 py-3.5 text-left">Invoice #</th>
              <th className="px-5 py-3.5 text-left">Client</th>
              <th className="px-5 py-3.5 text-left">Date</th>
              <th className="px-5 py-3.5 text-left">Due</th>
              <th className="px-5 py-3.5 text-right">Total</th>
              <th className="px-5 py-3.5 text-right">Balance</th>
              <th className="px-5 py-3.5 text-center">Status</th>
              <th className="px-5 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {listLoading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-500"><Loader2 size={18} className="animate-spin inline mr-2" />Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-gray-500">No invoices. Click <strong className="text-gray-300">Create Invoice</strong>.</td></tr>
            ) : filtered.map((inv) => (
              <tr key={inv.invoice_id || inv.invoice_number || Math.random()} className="hover:bg-gray-800/50 transition">
                <td className="px-5 py-4 font-mono text-blue-400 text-xs">{inv.invoice_number}</td>
                <td className="px-5 py-4 text-gray-200 text-xs">{inv.client?.client_name || `Client #${inv.client_id}`}</td>
                <td className="px-5 py-4 text-gray-400 text-xs">{fmtDate(inv.invoice_date)}</td>
                <td className="px-5 py-4 text-gray-400 text-xs">{fmtDate(inv.due_date)}</td>
                <td className="px-5 py-4 text-right font-semibold tabular-nums text-sm">{fmtCurrency(inv.total_amount)}</td>
                <td className="px-5 py-4 text-right tabular-nums text-red-400 text-xs">{fmtCurrency(inv.balance_amount)}</td>
                <td className="px-5 py-4 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[inv.status] || 'bg-gray-700 text-gray-300'}`}>{inv.status}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => handleView(inv)} title="View" className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"><Eye size={14} /></button>
                    {inv.status === 'DRAFT' && (
                      <button onClick={() => openSend(inv)} title="Send" className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition"><Send size={14} /></button>
                    )}
                    {['SENT','PARTIAL','OVERDUE'].includes(inv.status) && (
                      <button onClick={() => openPayment(inv)} title="Record Payment" className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-lg transition"><CreditCard size={14} /></button>
                    )}
                    <button onClick={() => handleDownload(inv)} title="PDF" disabled={downloading === inv.invoice_id} className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition disabled:opacity-40">
                      {downloading === inv.invoice_id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ CREATE INVOICE MODAL ════════════════════════════ */}
      {showInvoiceForm && (
        <ModalWrapper onClose={() => { setShowInvoiceForm(false); setInvoiceForm(EMPTY_INVOICE_FORM); }} maxW="max-w-3xl">
          <ModalHeader title="Create BMS Invoice" onClose={() => { setShowInvoiceForm(false); setInvoiceForm(EMPTY_INVOICE_FORM); }} />
          <form onSubmit={handleCreateInvoice} className="px-6 py-6 space-y-5">

            <Field label="Client" required>
              <div className="flex gap-2">
                <select value={invoiceForm.client_id} onChange={(e) => setInvField('client_id', e.target.value)} className={sel + ' flex-1'} required>
                  <option value="">Select a client...</option>
                  {clients.map(c => <option key={c.client_id || c.id} value={c.client_id || c.id}>{c.client_name}{c.client_code ? ` (${c.client_code})` : ''}</option>)}
                </select>
                <button type="button" onClick={() => setShowClientForm(true)} className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-700 hover:bg-gray-600 text-blue-400 rounded-lg text-sm font-medium border border-gray-600 transition whitespace-nowrap">
                  <Plus size={14} /> New Client
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Invoice Date" required>
                <input type="date" value={invoiceForm.invoice_date} onChange={(e) => setInvField('invoice_date', e.target.value)} className={inp} required />
              </Field>
              <Field label="Due Date" required>
                <input type="date" value={invoiceForm.due_date} onChange={(e) => setInvField('due_date', e.target.value)} className={inp} required />
              </Field>
              <Field label="Invoice Discount (₹)">
                <input type="number" placeholder="0" value={invoiceForm.discount_amount} onChange={(e) => setInvField('discount_amount', e.target.value)} className={inp} min="0" step="0.01" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Notes">
                <textarea rows={2} placeholder="Optional notes..." value={invoiceForm.notes} onChange={(e) => setInvField('notes', e.target.value)} className={inp + ' resize-none'} />
              </Field>
              <Field label="Terms & Conditions">
                <textarea rows={2} placeholder="Optional T&C..." value={invoiceForm.terms_conditions} onChange={(e) => setInvField('terms_conditions', e.target.value)} className={inp + ' resize-none'} />
              </Field>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-300">Line Items <span className="text-red-400">*</span></p>
                <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded-lg border border-gray-700 transition font-medium">
                  <Plus size={13} /> Add Item
                </button>
              </div>

              <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 uppercase tracking-wide mb-2 px-1">
                <span className="col-span-3">Particular</span>
                <span className="col-span-3">Description</span>
                <span className="col-span-1">Qty</span>
                <span className="col-span-2">Unit Price</span>
                <span className="col-span-1">GST</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-1"></span>
              </div>

              <div className="space-y-2">
                {invoiceForm.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <select
                      value={it.particular_id || ''}
                      onChange={(e) => onParticularSelect(idx, e.target.value)}
                      className={sel + ' col-span-3 text-xs'}
                    >
                      <option value="">-- Freehand --</option>
                      {particulars.length > 0 && (
                        <optgroup label="── BMS Particulars">
                          {particulars.map(p => (
                            <option key={`bms_${p.particular_id}`} value={p.particular_id}>{p.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    <input type="text" placeholder="Description" value={it.description} onChange={(e) => setItemField(idx, 'description', e.target.value)} className={inp + ' col-span-3 text-xs'} required />
                    <input type="number" placeholder="1" value={it.quantity} onChange={(e) => setItemField(idx, 'quantity', e.target.value)} className={inp + ' col-span-1 text-xs'} min="0.01" step="0.01" required />
                    <input type="number" placeholder="0.00" value={it.unit_price} onChange={(e) => setItemField(idx, 'unit_price', e.target.value)} className={inp + ' col-span-2 text-xs'} min="0" step="0.01" required />
                    <select value={it.tax_rate_id} onChange={(e) => setItemField(idx, 'tax_rate_id', e.target.value)} className={sel + ' col-span-1 text-xs'}>
                      <option value="">--</option>
                      {gstRates.map(r => <option key={r.tax_rate_id} value={r.tax_rate_id}>{r.rate}%</option>)}
                    </select>
                    <span className="col-span-1 text-right text-xs font-semibold text-gray-300 tabular-nums">{fmtCurrency(lineTotal(it))}</span>
                    <button type="button" onClick={() => removeItem(idx)} disabled={invoiceForm.items.length === 1} className="col-span-1 flex justify-center text-gray-600 hover:text-red-400 transition disabled:opacity-20">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 bg-gray-800/60 border border-gray-700 rounded-xl px-5 py-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-400"><span>Subtotal</span><span className="tabular-nums">{fmtCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-gray-400"><span>Invoice Discount</span><span className="tabular-nums text-red-400">− {fmtCurrency(invoiceForm.discount_amount)}</span></div>
                <div className="flex justify-between font-bold text-white border-t border-gray-700 pt-2"><span>Grand Total</span><span className="tabular-nums text-blue-400">{fmtCurrency(grandTotal)}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowInvoiceForm(false); setInvoiceForm(EMPTY_INVOICE_FORM); }} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition">Cancel</button>
              <button type="submit" disabled={creating} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition disabled:opacity-50">
                {creating && <Loader2 size={15} className="animate-spin" />}
                {creating ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* ═══ CREATE CLIENT MODAL ═════════════════════════════ */}
      {showClientForm && (
        <ModalWrapper onClose={() => { setShowClientForm(false); setClientForm(EMPTY_CLIENT_FORM); }}>
          <ModalHeader title="Add New Client" onClose={() => { setShowClientForm(false); setClientForm(EMPTY_CLIENT_FORM); }} />
          <form onSubmit={handleCreateClient} className="px-6 py-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Client Code" required><input type="text" placeholder="CL001" value={clientForm.client_code} onChange={(e) => setClientForm(f => ({ ...f, client_code: e.target.value }))} className={inp} required /></Field>
              <Field label="Client Name" required><input type="text" placeholder="Company Name" value={clientForm.client_name} onChange={(e) => setClientForm(f => ({ ...f, client_name: e.target.value }))} className={inp} required /></Field>
              <Field label="Email" required><input type="email" placeholder="billing@company.com" value={clientForm.email} onChange={(e) => setClientForm(f => ({ ...f, email: e.target.value }))} className={inp} required /></Field>
              <Field label="Phone" required><input type="text" placeholder="+91-9999999999" value={clientForm.phone} onChange={(e) => setClientForm(f => ({ ...f, phone: e.target.value }))} className={inp} required /></Field>
              <Field label="GSTIN"><input type="text" placeholder="29ABCDE1234F1Z5" value={clientForm.gstin} onChange={(e) => setClientForm(f => ({ ...f, gstin: e.target.value }))} className={inp} /></Field>
              <Field label="PAN"><input type="text" placeholder="ABCDE1234F" value={clientForm.pan} onChange={(e) => setClientForm(f => ({ ...f, pan: e.target.value }))} className={inp} /></Field>
              <Field label="Payment Terms (days)"><input type="number" value={clientForm.payment_terms_days} onChange={(e) => setClientForm(f => ({ ...f, payment_terms_days: e.target.value }))} className={inp} min="0" /></Field>
              <Field label="Credit Limit (₹)"><input type="number" value={clientForm.credit_limit} onChange={(e) => setClientForm(f => ({ ...f, credit_limit: e.target.value }))} className={inp} min="0" /></Field>
            </div>
            <Field label="Billing Address"><textarea rows={2} placeholder="Full billing address" value={clientForm.billing_address} onChange={(e) => setClientForm(f => ({ ...f, billing_address: e.target.value }))} className={inp + ' resize-none'} /></Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowClientForm(false); setClientForm(EMPTY_CLIENT_FORM); }} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition">Cancel</button>
              <button type="submit" disabled={creatingClient} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition disabled:opacity-50">
                {creatingClient && <Loader2 size={15} className="animate-spin" />}
                {creatingClient ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* ═══ VIEW INVOICE MODAL ══════════════════════════════ */}
      {showViewModal && selectedInvoice && (
        <ModalWrapper onClose={() => setShowViewModal(false)}>
          <ModalHeader title={selectedInvoice.invoice_number} onClose={() => setShowViewModal(false)} />
          <div className="px-6 py-6 space-y-5">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[selectedInvoice.status] || 'bg-gray-700 text-gray-300'}`}>{selectedInvoice.status}</span>
            <div className="grid grid-cols-2 gap-3">
              {[['Invoice Date', fmtDate(selectedInvoice.invoice_date)], ['Due Date', fmtDate(selectedInvoice.due_date)], ['Client', selectedInvoice.client?.client_name || `#${selectedInvoice.client_id}`], ['Invoice ID', selectedInvoice.invoice_id]].map(([l, v]) => (
                <div key={l} className="bg-gray-800 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{l}</p>
                  <p className="text-sm font-semibold text-white">{v ?? '-'}</p>
                </div>
              ))}
            </div>
            {selectedInvoice.items?.length > 0 && (
              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-500 text-xs uppercase border-b border-gray-700">
                    <th className="px-4 py-2.5 text-left">Description</th>
                    <th className="px-4 py-2.5 text-right">Qty</th>
                    <th className="px-4 py-2.5 text-right">Price</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-700">
                    {selectedInvoice.items.map((it, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-gray-200">{it.description}</td>
                        <td className="px-4 py-3 text-right text-gray-400 tabular-nums">{it.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-400 tabular-nums">{fmtCurrency(it.unit_price)}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmtCurrency(it.total_amount ?? it.quantity * it.unit_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-5 py-4 space-y-1.5 text-sm">
              {selectedInvoice.discount_amount > 0 && <div className="flex justify-between text-gray-400"><span>Discount</span><span className="text-red-400 tabular-nums">− {fmtCurrency(selectedInvoice.discount_amount)}</span></div>}
              <div className="flex justify-between font-bold text-white border-t border-gray-700 pt-2"><span>Total</span><span className="text-blue-400 tabular-nums">{fmtCurrency(selectedInvoice.total_amount)}</span></div>
              {selectedInvoice.paid_amount > 0 && <div className="flex justify-between text-green-400 text-xs"><span>Paid</span><span className="tabular-nums">{fmtCurrency(selectedInvoice.paid_amount)}</span></div>}
              {selectedInvoice.balance_amount > 0 && <div className="flex justify-between text-red-400 text-xs"><span>Balance</span><span className="tabular-nums">{fmtCurrency(selectedInvoice.balance_amount)}</span></div>}
            </div>
            {selectedInvoice.notes && <div className="bg-gray-800 rounded-xl px-4 py-3"><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm text-gray-300">{selectedInvoice.notes}</p></div>}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowViewModal(false); handleDownload(selectedInvoice); }} className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-yellow-400 rounded-lg text-sm font-medium transition"><Download size={15} /> PDF</button>
              {selectedInvoice.status === 'DRAFT' && <button onClick={() => { setShowViewModal(false); openSend(selectedInvoice); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition"><Send size={15} /> Send</button>}
              {['SENT','PARTIAL','OVERDUE'].includes(selectedInvoice.status) && <button onClick={() => { setShowViewModal(false); openPayment(selectedInvoice); }} className="flex items-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-semibold transition"><CreditCard size={15} /> Payment</button>}
              <button onClick={() => setShowViewModal(false)} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition">Close</button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* ═══ SEND MODAL ═════════════════════════════════════ */}
      {showSendModal && selectedInvoice && (
        <ModalWrapper onClose={() => setShowSendModal(false)} maxW="max-w-lg">
          <ModalHeader title={`Send ${selectedInvoice.invoice_number}`} onClose={() => setShowSendModal(false)} />
          <form onSubmit={handleSend} className="px-6 py-6 space-y-4">
            <Field label="Recipient Email" required><input type="email" placeholder="client@company.com" value={sendForm.email} onChange={(e) => setSendForm(f => ({ ...f, email: e.target.value }))} className={inp} required /></Field>
            <Field label="CC (comma separated)"><input type="text" placeholder="accounts@acme.com" value={sendForm.send_copy_to} onChange={(e) => setSendForm(f => ({ ...f, send_copy_to: e.target.value }))} className={inp} /></Field>
            <Field label="Message"><textarea rows={3} placeholder="Please find your invoice attached." value={sendForm.message} onChange={(e) => setSendForm(f => ({ ...f, message: e.target.value }))} className={inp + ' resize-none'} /></Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowSendModal(false)} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition">Cancel</button>
              <button type="submit" disabled={sending} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition disabled:opacity-50">
                {sending && <Loader2 size={15} className="animate-spin" />}
                {sending ? 'Sending...' : 'Send Invoice'}
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* ═══ PAYMENT MODAL ══════════════════════════════════ */}
      {showPaymentModal && selectedInvoice && (
        <ModalWrapper onClose={() => setShowPaymentModal(false)} maxW="max-w-lg">
          <ModalHeader title={`Record Payment — ${selectedInvoice.invoice_number}`} onClose={() => setShowPaymentModal(false)} />
          <form onSubmit={handlePayment} className="px-6 py-6 space-y-4">
            <div className="bg-gray-800 rounded-xl px-4 py-3 flex justify-between text-sm">
              <span className="text-gray-400">Balance Due</span>
              <span className="font-bold text-red-400 tabular-nums">{fmtCurrency(selectedInvoice.balance_amount || selectedInvoice.total_amount)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount (₹)" required><input type="number" placeholder="0.00" value={paymentForm.amount} onChange={(e) => setPaymentForm(f => ({ ...f, amount: e.target.value }))} className={inp} min="0.01" step="0.01" required /></Field>
              <Field label="Payment Date" required><input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))} className={inp} required /></Field>
            </div>
            <Field label="Payment Mode">
              <select value={paymentForm.payment_mode_id} onChange={(e) => setPaymentForm(f => ({ ...f, payment_mode_id: e.target.value }))} className={sel}>
                <option value="">Select mode...</option>
                {payModes.map(m => <option key={m.payment_mode_id || m.id} value={m.payment_mode_id || m.id}>{m.mode_name || m.name}</option>)}
              </select>
            </Field>
            <Field label="Reference / UTR"><input type="text" placeholder="NEFT/123456789" value={paymentForm.reference_number} onChange={(e) => setPaymentForm(f => ({ ...f, reference_number: e.target.value }))} className={inp} /></Field>
            <Field label="Notes"><textarea rows={2} placeholder="Optional..." value={paymentForm.notes} onChange={(e) => setPaymentForm(f => ({ ...f, notes: e.target.value }))} className={inp + ' resize-none'} /></Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowPaymentModal(false)} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition">Cancel</button>
              <button type="submit" disabled={paying} className="flex items-center gap-2 px-6 py-2.5 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-semibold transition disabled:opacity-50">
                {paying && <Loader2 size={15} className="animate-spin" />}
                {paying ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}
    </div>
  );
}