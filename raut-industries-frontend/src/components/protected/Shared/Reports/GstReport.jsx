import { useEffect, useState } from 'react'
import ReportsRepo from '../../../../services/repository/Shared/ReportsRepo'
import {
  ReportPage, MonthYearPicker,
  ReportKpi, ReportSection,
} from './_components/ReportWrapper'
import { formatCurrency, monthName, extractError } from '../../../../utils/helpers'
import SendReportModal from './_components/SendReportModal'

export default function GstReport() {
  const now = new Date()

  const [month,   setMonth]   = useState(now.getMonth() + 1)
  const [year,    setYear]    = useState(now.getFullYear())
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [showSendModal, setShowSendModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await ReportsRepo.getGst(month, year)
        setData(res.data)
      } catch (err) {
        setError(extractError(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [month, year])

  const breakdown = data?.breakdown || []
  const totals    = data?.totals    || {}

  return (
    <>
    <ReportPage
      title="GST Reconciliation"
      subtitle={`${monthName(month)} ${year} · CGST + SGST breakdown`}
      loading={loading}
      error={error}
      controls={
        <div className="flex items-center gap-4">
          <MonthYearPicker
            month={month}
            year={year}
            onChange={(m, y) => { setMonth(m); setYear(y) }}
          />
          <button
            onClick={() => setShowSendModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
          >
            📧 Send Report
          </button>
        </div>
      }
    >
      {/* Totals KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpi
          label="Taxable Value"
          value={formatCurrency(totals.taxable_value)}
          color="text-black"
        />
        <ReportKpi
          label="Total CGST"
          value={formatCurrency(totals.total_cgst)}
          color="text-blue-400"
        />
        <ReportKpi
          label="Total SGST"
          value={formatCurrency(totals.total_sgst)}
          color="text-blue-400"
        />
        <ReportKpi
          label="Total Tax"
          value={formatCurrency(totals.total_tax)}
          sub={`${data?.confirmed_bills || 0} confirmed bills`}
          color="text-blue-400"
        />
      </div>

      {/* HSN-wise breakdown */}
      <ReportSection title="HSN / SAC Wise Breakdown">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100/30">
                {['HSN Code', 'Taxable Value',
                  'CGST %', 'CGST Amt',
                  'SGST %', 'SGST Amt',
                  'IGST %', 'IGST Amt',
                  'Total Tax'].map((h) => (
                  <th key={h}
                    className="px-4 py-2.5 text-left text-xs text-gray-600
                               font-semibold uppercase tracking-wide
                               whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {breakdown.length === 0
                ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8
                                               text-gray-600 text-sm">
                      No GST data for this period
                    </td>
                  </tr>
                )
                : breakdown.map((row, i) => (
                  <tr key={i} className="table-row-hover">
                    <td className="px-4 py-2.5 font-mono text-xs
                                   text-black font-semibold">
                      {row.hsn_code}
                    </td>
                    <td className="px-4 py-2.5 text-black font-medium">
                      {formatCurrency(row.taxable_value)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">
                      {row.cgst_rate}%
                    </td>
                    <td className="px-4 py-2.5 text-blue-400">
                      {formatCurrency(row.cgst_amount)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">
                      {row.sgst_rate}%
                    </td>
                    <td className="px-4 py-2.5 text-blue-400">
                      {formatCurrency(row.sgst_amount)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">
                      {parseFloat(row.igst_rate) > 0 ? `${row.igst_rate}%` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-blue-400">
                      {parseFloat(row.igst_amount) > 0
                        ? formatCurrency(row.igst_amount)
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-2.5 font-bold text-blue-400">
                      {formatCurrency(row.total_tax)}
                    </td>
                  </tr>
                ))
              }
            </tbody>
            {breakdown.length > 0 && (
              <tfoot className="border-t-2 border-gray-200 bg-gray-100/40">
                <tr>
                  <td className="px-4 py-3 text-xs font-bold text-black
                                 uppercase tracking-wide">
                    Total
                  </td>
                  <td className="px-4 py-3 font-bold text-black">
                    {formatCurrency(totals.taxable_value)}
                  </td>
                  <td />
                  <td className="px-4 py-3 font-bold text-blue-400">
                    {formatCurrency(totals.total_cgst)}
                  </td>
                  <td />
                  <td className="px-4 py-3 font-bold text-blue-400">
                    {formatCurrency(totals.total_sgst)}
                  </td>
                  <td />
                  <td className="px-4 py-3 font-bold text-blue-400">
                    {parseFloat(totals.total_igst || 0) > 0
                      ? formatCurrency(totals.total_igst)
                      : '—'
                    }
                  </td>
                  <td className="px-4 py-3 font-bold text-blue-400 text-base">
                    {formatCurrency(totals.total_tax)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </ReportSection>
    </ReportPage>
    <SendReportModal
      isOpen={showSendModal}
      onClose={() => setShowSendModal(false)}
      reportType="gst"
      month={month}
      year={year}
      reportName={`GST Reconciliation - ${monthName(month)} ${year}`}
    />
    </>
  )
}