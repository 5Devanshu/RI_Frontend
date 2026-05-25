import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Mail, Phone, MapPin, X, Save } from 'lucide-react';
import {
  listBmsClientsApi,
  createBmsClientApi,
} from '../../../../services/repository/Manager/BmsRepo';

const emptyForm = {
  client_name: '',
  email: '',
  phone: '',
  billing_address: '',
  gstin: '',
  pan: '',
  credit_limit: 0,
  payment_terms_days: 30,
};

export default function BmsClients() {
  const [clients, setClients]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);
  const [search, setSearch]     = useState('');

  // Get auth token to ensure we only load after auth is ready
  const token = localStorage.getItem('raut_token');

  const load = async () => {
    setLoading(true);
    try {
      const res = await listBmsClientsApi({ limit: 100 });
      const d = res.data?.data;
      const list = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
      setClients(list);
    } catch {
      setMsg({ type: 'error', text: 'Failed to load clients from BMS' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      load();
    }
  }, [token]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_name.trim()) return;
    setSaving(true);
    try {
      const res = await createBmsClientApi(form);
      if (res.data.success) {
        setMsg({ type: 'success', text: `Client "${form.client_name}" created and synced to BMS!` });
        setForm(emptyForm);
        setShowForm(false);
        load();
      } else {
        setMsg({ type: 'error', text: res.data.message || 'Failed to create client' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create client' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = clients.filter(c =>
    c.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BMS Clients</h1>
          <p className="text-sm text-gray-500 mt-1">Clients sync automatically to BMS billing system</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm hover:bg-gray-800 transition">
            <Plus size={15} /> Add Client
          </button>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center justify-between
          ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200'
                                   : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {msg.text}
          <button onClick={() => setMsg(null)}><X size={14} /></button>
        </div>
      )}

      {/* Search */}
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search clients by name, email or phone..."
        className="w-full mb-5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm
                   bg-gray-50 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
      />

      {/* Client Grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading clients from BMS...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {search ? 'No clients match your search.' : 'No clients yet. Add your first client!'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <div key={client.client_id}
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {client.client_name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{client.client_name}</p>
                  <p className="text-xs text-gray-400">{client.client_code}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {client.email && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail size={12} /> <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone size={12} /> {client.phone}
                  </div>
                )}
                {client.billing_address && (
                  <div className="flex items-start gap-2 text-xs text-gray-500">
                    <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{client.billing_address}</span>
                  </div>
                )}
              </div>
              {(client.gstin || client.pan) && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-3">
                  {client.gstin && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg">GST: {client.gstin}</span>}
                  {client.pan  && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">PAN: {client.pan}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Client Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add New Client</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Client Name *</label>
                <input required value={form.client_name} onChange={e => set('client_name', e.target.value)}
                  placeholder="Acme Corporation"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="client@example.com"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Billing Address</label>
                <textarea value={form.billing_address} onChange={e => set('billing_address', e.target.value)}
                  rows={3} placeholder="Full billing address..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">GSTIN</label>
                  <input value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5" maxLength={15}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">PAN</label>
                  <input value={form.pan} onChange={e => set('pan', e.target.value.toUpperCase())}
                    placeholder="AAAAA0000A" maxLength={10}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Terms (days)</label>
                  <input type="number" value={form.payment_terms_days}
                    onChange={e => set('payment_terms_days', parseInt(e.target.value))}
                    min={0} max={365}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Credit Limit (₹)</label>
                  <input type="number" value={form.credit_limit}
                    onChange={e => set('credit_limit', parseFloat(e.target.value))}
                    min={0}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black" />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-600">
                ✓ This client will be automatically synced to BMS billing system
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-black text-white rounded-xl text-sm hover:bg-gray-800 transition flex items-center justify-center gap-2">
                  {saving ? 'Saving...' : <><Save size={14} /> Save & Sync to BMS</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}