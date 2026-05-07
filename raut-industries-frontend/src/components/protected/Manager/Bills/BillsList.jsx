import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, X, Filter,
  CheckCircle, XCircle, Loader2,
} from 'lucide-react'
import BillsRepo from '../../../../services/repository/Manager/BillsRepo'
import {
  ListPageWrapper, LoadingState,
  ErrorState, EmptyState, Toast, ConfirmModal,
} from '../../../protected/Admin/Masters/_components/MasterPageWrapper'
import {
  formatCurrency, formatDate, formatNumber,
  billStatusBadge, extractError,
  hasRole, ROLES,
} from '../../../../utils/helpers'
import { useSelector } from 'react-redux'
import { selectUser } from '../../../../app/DashboardSlice'
import billColumns from '../../../data/processColumnsConfig'
import SendBillModal from './_components/SendBillModal'

const MONTHS = [
  '', 'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const STATUS_OPTIONS = ['', 'draft', 'confirmed', 'cancelled']

export default function BillsList() {
  const navigate = useNavigate()
  const user     = useSelector(selectUser)
  const isAdmin  = hasRole(user, ROLES.SUPER_ADMIN, ROLES.ADMIN)

  const now = new Date()

  const [bills,    setBills]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [toast,    setToast]    = useState({ type: '', message: '' })
  const [confirm,  setConfirm]  = useState(null)
  const [acting,   setActing]   = useState(false)
  const [sendBillModal, setSendBillModal] = useState({ isOpen: false, billId: null, billNumber: null })

  // Filters
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('')
  const [month,    setMonth]    = useState(now.getMonth() + 1)
  const [year,     setYear]     = useState(now.getFullYear())

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await BillsRepo.getAll({
        search: search || undefined,
        status: status || undefined,
        month:  month  || undefined,
        year:   year   || undefined,
      })
      setBills(res.data || [])
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }, [search, status, month, year])

  useEffect(() => { load() }, [load])

  // ── Confirm / Cancel ────────────────────────────────────────
  const handleAction = async () => {
    if (!confirm) return
    setActing(true)
    try {
      if (confirm.action === 'confirm') {
        await BillsRepo.confirm(confirm.id)
        setToast({ type: 'success', message: `Bill #${confirm.bill_no} confirmed` })
      } else {
        await BillsRepo.cancel(confirm.id)
        setToast({ type: 'success', message: `Bill #${confirm.bill_no} cancelled` })
      }
      setConfirm(null)
      load()
    } catch (err) {
      setToast({ type: 'error', message: extractError(err) })
      setConfirm(null)
    } finally {
      setActing(false)
    }
  }

  // ── Totals row ──────────────────────────────────────────────
  const confirmed = bills.filter((b) => b.status === 'confirmed')
  const totals = {
    subtotal:     confirmed.reduce((s, b) => s + parseFloat(b.subtotal     || 0), 0),
    gst:          confirmed.reduce((s, b) => s + parseFloat(b.gst_total    || 0), 0),
    total:        confirmed.reduce((s, b) => s + parseFloat(b.total_with_gst||0), 0),
    pieces:       confirmed.reduce((s, b) => s + parseFloat(b.total_pieces || 0), 0),
  }

  if (error) return <ErrorState message={error} />

  return (
    <>
    <ListPageWrapper
      title="Bills"
      subtitle={`${bills.length} bills · ${confirmed.length} confirmed`}
      action={
        <button
          onClick={() => navigate('/bills/new')}
          className="btn-primary text-xs"
        >
          <Plus size={14} /> New Bill
        </button>
      }
    >
      {toast.message && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast({ type: '', message: '' })}
        />
      )}

      {confirm && (
        <ConfirmModal
          message={
            confirm.action === 'confirm'
              ? `Confirm Bill #${confirm.bill_no}? This cannot be edited afterwards.`
              : `Cancel Bill #${confirm.bill_no}? This action cannot be undone.`
          }
          onConfirm={handleAction}
          onCancel={() => setConfirm(null)}
          loading={acting}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client..."
            className="input-field pl-8 pr-8 w-44"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2
                         text-gray-600 hover:text-black"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="select-field w-36"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Status'}
            </option>
          ))}
        </select>

        {/* Month */}
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="select-field w-36"
        >
          <option value="">All Months</option>
          {MONTHS.slice(1).map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>

        {/* Year */}
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="select-field w-28"
        >
          {[2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Totals summary bar */}
      {confirmed.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Subtotal',    value: formatCurrency(totals.subtotal), color: 'text-black' },
            { label: 'GST',         value: formatCurrency(totals.gst),      color: 'text-gray-600' },
            { label: 'Total',       value: formatCurrency(totals.total),    color: 'text-blue-400' },
            { label: 'Pieces',      value: formatNumber(totals.pieces, 0),  color: 'text-black' },
          ].map((s) => (
            <div key={s.label}
              className="card px-4 py-3 flex items-center
                         justify-between">
              <p className="text-xs text-gray-600">{s.label}</p>
              <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading
        ? <LoadingState />
        : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-100/40">
                    {[...billColumns.map((c) => c.label), 'Actions'].map((h) => (
                      <th key={h}
                        className="px-4 py-3 text-left text-xs text-gray-600
                                   font-semibold uppercase tracking-wide
                                   whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {bills.length === 0
                    ? (
                      <tr>
                        <td colSpan={billColumns.length + 1}>
                          <EmptyState message="No bills found for this period" />
                        </td>
                      </tr>
                    )
                    : bills.map((bill) => (
                      <tr
                        key={bill.id}
                        className="table-row-hover cursor-pointer"
                        onClick={() => navigate(`/bills/${bill.id}/preview`)}
                      >
                        {billColumns.map((col) => (
                          <td key={col.key} className="px-4 py-3">
                            {col.badge
                              ? (
                                <span className={col.badge(bill)}>
                                  {col.render(bill)}
                                </span>
                              )
                              : (
                                <div>
                                  <span className={col.className}>
                                    {col.render(bill)}
                                  </span>
                                  {col.sub?.(bill) && (
                                    <p className="text-[10px] text-gray-600
                                                  font-mono mt-0.5">
                                      {col.sub(bill)}
                                    </p>
                                  )}
                                </div>
                              )
                            }
                          </td>
                        ))}

                        {/* Actions */}
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5">

                            {/* Edit — draft only */}
                            {bill.status === 'draft' && (
                              <button
                                onClick={() => navigate(`/bills/${bill.id}/edit`)}
                                className="text-xs text-gray-600 hover:text-blue-400
                                           px-2 py-1 rounded hover:bg-blue-500/10
                                           transition-colors font-medium"
                              >
                                Edit
                              </button>
                            )}

                            {/* Confirm — draft only */}
                            {bill.status === 'draft' && (
                              <button
                                onClick={() => setConfirm({
                                  id:      bill.id,
                                  bill_no: bill.bill_no,
                                  action:  'confirm',
                                })}
                                className="text-xs text-gray-600 hover:text-emerald-400
                                           px-2 py-1 rounded hover:bg-emerald-500/10
                                           transition-colors font-medium flex items-center gap-1"
                              >
                                <CheckCircle size={12} /> Confirm
                              </button>
                            )}

                            {/* Cancel — admin only, not already cancelled */}
                            {isAdmin && bill.status !== 'cancelled' && (
                              <button
                                onClick={() => setConfirm({
                                  id:      bill.id,
                                  bill_no: bill.bill_no,
                                  action:  'cancel',
                                })}
                                className="text-xs text-gray-600 hover:text-red-400
                                           px-2 py-1 rounded hover:bg-red-500/10
                                           transition-colors font-medium flex items-center gap-1"
                              >
                                <XCircle size={12} /> Cancel
                              </button>
                            )}

                            {/* Send via Email */}
                            <button
                              onClick={() => setSendBillModal({
                                isOpen: true,
                                billId: bill.id,
                                billNumber: bill.bill_no,
                              })}
                              className="text-xs text-gray-600 hover:text-blue-400
                                         px-2 py-1 rounded hover:bg-blue-500/10
                                         transition-colors font-medium"
                            >
                              📧 Send
                            </button>

                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      </ListPageWrapper>

    <SendBillModal
      isOpen={sendBillModal.isOpen}
      onClose={() =>
        setSendBillModal({
          isOpen: false,
          billId: null,
          billNumber: null,
        })
      }
      billId={sendBillModal.billId}
      billNumber={sendBillModal.billNumber}
    />
  </>
)
}