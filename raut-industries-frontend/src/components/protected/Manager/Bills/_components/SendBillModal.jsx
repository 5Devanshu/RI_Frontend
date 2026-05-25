import { useState } from 'react'
import { Send, X, CheckCircle, Loader2 } from 'lucide-react'
import Connector from '../../../../../services/Connector'
import Apis from '../../../../../services/Apis'
import BillsRepo from '../../../../../services/repository/Manager/BillsRepo'

export default function SendBillModal({ bill, onClose, onSent }) {
  const [sendForm,  setSendForm]  = useState({
    email:        bill?.client?.email || '',
    send_copy_to: '',
    message:      '',
  });
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendDone,  setSendDone]  = useState(false);

  // ── Handler — uses BMS API send invoice ─────────────────────────────────────
  const handleSendViaBMS = async () => {
    if (!sendForm.email.trim()) return setSendError('Recipient email is required');
    setSending(true); setSendError('');

    try {
      await Connector.post(Apis.bmsSendBill, {
        billId:       bill.id,
        email:        sendForm.email.trim(),
        send_copy_to: sendForm.send_copy_to.trim(),
        message:      sendForm.message.trim() || undefined,
      });
      setSendDone(true);
      setTimeout(() => { onSent?.(); onClose(); }, 2000);
    } catch (e) {
      setSendError(e.response?.data?.message || e.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="rounded-2xl border w-full max-w-md shadow-xl"
        style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 border-b"
          style={{ borderColor: 'var(--surface-border)' }}
        >
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
              Send Bill via BMS
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Bill #{bill?.bill_no} — BMS will email the PDF using your M&D Reference template
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {sendDone ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <CheckCircle size={52} className="text-green-500" />
              <p className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>
                Bill Sent!
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Bill #{bill?.bill_no} was emailed to{' '}
                <strong>{sendForm.email}</strong> via BMS
              </p>
            </div>
          ) : (
            <>
              {/* Bill summary strip */}
              <div
                className="p-3 rounded-xl text-sm space-y-0.5"
                style={{ backgroundColor: 'var(--surface-bg)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sending</p>
                <p className="font-bold" style={{ color: 'var(--text-main)' }}>
                  Bill #{bill?.bill_no}
                </p>
                <p style={{ color: 'var(--text-muted)' }}>
                  {bill?.client?.name || bill?.client_name || '—'}
                </p>
                <p className="font-semibold" style={{ color: 'var(--text-main)' }}>
                  ₹{Number(bill?.total_with_gst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Error */}
              {sendError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {sendError}
                </div>
              )}

              {/* To */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  To (Email) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={sendForm.email}
                  onChange={e => setSendForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="client@company.com"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderColor:     'var(--surface-border)',
                    color:           'var(--text-main)',
                  }}
                />
              </div>

              {/* CC */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  CC (comma-separated, optional)
                </label>
                <input
                  type="text"
                  value={sendForm.send_copy_to}
                  onChange={e => setSendForm(f => ({ ...f, send_copy_to: e.target.value }))}
                  placeholder="cc1@company.com, cc2@company.com"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderColor:     'var(--surface-border)',
                    color:           'var(--text-main)',
                  }}
                />
              </div>

              {/* Message */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Message (optional)
                </label>
                <textarea
                  rows={3}
                  value={sendForm.message}
                  onChange={e => setSendForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Please find your bill attached…"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderColor:     'var(--surface-border)',
                    color:           'var(--text-main)',
                  }}
                />
              </div>

              <p className="text-xs rounded-lg p-2"
                style={{ color: 'var(--text-muted)', backgroundColor: 'var(--surface-bg)' }}>
                📎 BMS will generate the PDF using the M&D Reference template and email it to the client.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        {!sendDone && (
          <div
            className="flex justify-end gap-3 p-5 border-t"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border text-sm"
              style={{ borderColor: 'var(--surface-border)', color: 'var(--text-main)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSendViaBMS}
              disabled={sending || !sendForm.email.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {sending
                ? <><Loader2 size={15} className="animate-spin" /> Sending…</>
                : <><Send size={15} /> Send via BMS</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}