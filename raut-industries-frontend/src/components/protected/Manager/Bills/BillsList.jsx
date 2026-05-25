import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, X, Send,
  CheckCircle, XCircle,
} from 'lucide-react'
import BillsRepo from '../../../../services/repository/Manager/BillsRepo'
import {
  ListPageWrapper, LoadingState,
  ErrorState, EmptyState, Toast, ConfirmModal,
} from '../../../protected/Admin/Masters/_components/MasterPageWrapper'
import {
  formatCurrency, formatDate, formatNumber,
  extractError, hasRole, ROLES,
} from '../../../../utils/helpers'
import { useSelector } from 'react-redux'
import { selectUser } from '../../../../app/DashboardSlice'
import billColumns from '../../../data/processColumnsConfig'
import SendBillModal from './_components/SendBillModal'

export default function BillsList() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBill, setSelectedBill] = useState(null)
  const [showSendModal, setShowSendModal] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [confirmAction, setConfirmAction] = useState({ show: false, title: '', onConfirm: null })

  const user = useSelector(selectUser)
  const navigate = useNavigate()

  // ── Fetch bills ──────────────────────────────────────────────────────────
  const fetchBills = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await BillsRepo.getAll()
      const data = res.data?.data || res.data || []
      setBills(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(extractError(e) || 'Failed to load bills')
      setBills([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBills()
  }, [fetchBills])

  const filteredBills = bills.filter(bill =>
    (bill.bill_no?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (bill.client?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  const handleSendBill = (bill) => {
    setSelectedBill(bill)
    setShowSendModal(true)
  }

  const handleCancelBill = (bill) => {
    setConfirmAction({
      show: true,
      title: `Cancel Bill #${bill.bill_no}?`,
      onConfirm: async () => {
        try {
          await BillsRepo.delete(bill.id)
          setToast({ show: true, message: 'Bill cancelled successfully', type: 'success' })
          fetchBills()
        } catch (e) {
          setToast({ show: true, message: extractError(e) || 'Failed to cancel bill', type: 'error' })
        }
        setConfirmAction({ show: false, title: '', onConfirm: null })
      }
    })
  }

  const handleSentSuccess = () => {
    setToast({ show: true, message: 'Bill sent successfully', type: 'success' })
    fetchBills()
  }

  return (
    <ListPageWrapper
      title="Bills"
      actionButton={{
        label: 'New Bill',
        icon: Plus,
        onClick: () => navigate('/manager/bills/create'),
        permission: ROLES.MANAGER,
      }}
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search by bill no, client…"
    >
      {loading && <LoadingState />}

      {error && <ErrorState message={error} onRetry={fetchBills} />}

      {!loading && !error && filteredBills.length === 0 && (
        <EmptyState
          message={bills.length === 0 ? 'No bills yet' : 'No matching bills'}
          actionLabel={bills.length === 0 ? 'Create Bill' : undefined}
          onAction={bills.length === 0 ? () => navigate('/manager/bills/create') : undefined}
        />
      )}

      {!loading && !error && filteredBills.length > 0 && (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--surface-border)' }}>
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--surface-bg)' }}>
              <tr className="border-b" style={{ borderColor: 'var(--surface-border)' }}>
                {billColumns.map(col => (
                  <th key={col.id} className="px-4 py-3 text-left font-semibold">
                    <span style={{ color: 'var(--text-muted)' }}>{col.label}</span>
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-semibold">
                  <span style={{ color: 'var(--text-muted)' }}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map(bill => (
                <tr key={bill.id} className="border-b hover:opacity-75 transition" style={{ borderColor: 'var(--surface-border)' }}>
                  <td className="px-4 py-3" style={{ color: 'var(--text-main)' }}>#{bill.bill_no}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-main)' }}>{bill.client?.name || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--text-main)' }}>
                    {formatCurrency(bill.total_with_gst || 0)}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(bill.bill_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-1 rounded-full font-semibold
                      ${bill.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700'
                        : bill.status === 'draft' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2 flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/manager/bills/${bill.id}`)}
                      className="text-xs px-2 py-1 rounded hover:opacity-70 transition"
                      style={{ color: 'var(--brand-primary)', backgroundColor: 'var(--surface-bg)' }}
                    >
                      View
                    </button>
                    {bill.status === 'confirmed' && (
                      <button
                        onClick={() => handleSendBill(bill)}
                        className="text-xs px-2 py-1 rounded hover:opacity-70 transition flex items-center gap-1"
                        style={{ color: '#fff', backgroundColor: 'var(--brand-primary)' }}
                      >
                        <Send size={12} /> Send
                      </button>
                    )}
                    {bill.status === 'draft' && (
                      <button
                        onClick={() => handleCancelBill(bill)}
                        className="text-xs px-2 py-1 rounded hover:opacity-70 transition text-red-600"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSendModal && selectedBill && (
        <SendBillModal
          bill={selectedBill}
          onClose={() => setShowSendModal(false)}
          onSent={handleSentSuccess}
        />
      )}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}

      {confirmAction.show && (
        <ConfirmModal
          title={confirmAction.title}
          onConfirm={() => confirmAction.onConfirm?.()}
          onCancel={() => setConfirmAction({ show: false, title: '', onConfirm: null })}
        />
      )}
    </ListPageWrapper>
  )
}