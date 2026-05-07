import { useEffect, useState } from 'react'
import ReportsRepo from '../../../../services/repository/Shared/ReportsRepo'
import {
  ReportPage, MonthYearPicker,
  ReportKpi, ReportSection,
} from './_components/ReportWrapper'
import {
  formatCurrency, monthName, extractError,
} from '../../../../utils/helpers'
import SendReportModal from './_components/SendReportModal'

const DEPARTMENTS = [
  '', 'Production', 'Processing', 'QC',
  'Stores', 'Admin', 'Accounts', 'Maintenance',
]

const pctColor = (pct) => {
  if (pct >= 80) return 'text-emerald-400'
  if (pct >= 60) return 'text-blue-400'
  return 'text-red-400'
}

export default function AttendanceReport() {
  const now = new Date()

  const [month,      setMonth]      = useState(now.getMonth() + 1)
  const [year,       setYear]       = useState(now.getFullYear())
  const [department, setDepartment] = useState('')
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [showSendModal, setShowSendModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await ReportsRepo.getAttendance(month, year)
        setData(res.data)
      } catch (err) {
        setError(extractError(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [month, year])

  const employees    = data?.employees    || []
  const totals       = data?.totals       || {}
  const byDepartment = data?.by_department || []

  const filtered = department
    ? employees.filter((e) => e.department === department)
    : employees

  return (
    <>
    <ReportPage
      title="Attendance Report"
      subtitle={`${monthName(month)} ${year} · ${totals.employee_count || 0} employees`}
      loading={loading}
      error={error}
      controls={
        <div className="flex items-center gap-4">
          <MonthYearPicker
            month={month}
            year={year}
            onChange={(m, y) => { setMonth(m); setYear(y) }}
          />
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="select-field w-44 text-xs"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d || 'All Departments'}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowSendModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
          >
            📧 Send Report
          </button>
        </div>
      }
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpi
          label="Employees"
          value={totals.employee_count || 0}
          color="text-black"
        />
        <ReportKpi
          label="Total Present Days"
          value={totals.total_present_days || 0}
          color="text-emerald-400"
        />
        <ReportKpi
          label="Total Absent Days"
          value={totals.total_absent_days || 0}
          color="text-red-400"
        />
        <ReportKpi
          label="Total Payable"
          value={formatCurrency(totals.total_payable_salary)}
          color="text-blue-400"
        />
      </div>

      {/* Department summary */}
      {byDepartment.length > 0 && (
        <ReportSection title="Department Summary">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100/30">
                  {['Department', 'Employees',
                    'Present', 'Absent', 'Half Day', 'Leave',
                    'Total Payable'].map((h) => (
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
                {byDepartment.map((d) => (
                  <tr key={d.department} className="table-row-hover">
                    <td className="px-4 py-2.5">
                      <span className="badge-info text-xs">
                        {d.department}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-black">
                      {d.employee_count}
                    </td>
                    <td className="px-4 py-2.5 text-emerald-400 font-semibold">
                      {d.total_present}
                    </td>
                    <td className="px-4 py-2.5 text-red-400 font-semibold">
                      {d.total_absent}
                    </td>
                    <td className="px-4 py-2.5 text-blue-400">
                      {d.total_half_day}
                    </td>
                    <td className="px-4 py-2.5 text-blue-400">
                      {d.total_leave}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-blue-400">
                      {formatCurrency(d.total_payable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>
      )}

      {/* Employee detail */}
      <ReportSection title={`Employee Detail${department ? ` — ${department}` : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100/30">
                {['Code', 'Name', 'Dept',
                  'P', 'A', 'H', 'L',
                  'Eff. Days', 'Att %',
                  'Salary', 'Payable'].map((h) => (
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
              {filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={11}
                      className="text-center py-8 text-gray-600 text-sm">
                      No data for this period
                    </td>
                  </tr>
                )
                : filtered.map((emp) => {
                  const pct = emp.total_marked_days > 0
                    ? Math.round(
                        ((emp.present_count + emp.half_day_count * 0.5)
                          / emp.total_marked_days) * 100
                      )
                    : 0

                  return (
                    <tr key={emp.emp_code} className="table-row-hover">
                      <td className="px-4 py-2.5 font-mono text-xs
                                     text-gray-600">
                        {emp.emp_code}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-black">
                          {emp.employee_name}
                        </p>
                        <p className="text-[10px] text-gray-600">
                          {emp.role}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="badge-info text-xs">
                          {emp.department}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-emerald-400
                                     font-bold">
                        {emp.present_count}
                      </td>
                      <td className="px-4 py-2.5 text-red-400 font-bold">
                        {emp.absent_count}
                      </td>
                      <td className="px-4 py-2.5 text-blue-400">
                        {emp.half_day_count}
                      </td>
                      <td className="px-4 py-2.5 text-blue-400">
                        {emp.leave_count}
                      </td>
                      <td className="px-4 py-2.5 text-black">
                        {emp.effective_days}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-bold
                                          ${pctColor(pct)}`}>
                          {pct}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {formatCurrency(emp.monthly_salary)}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-blue-400">
                        {formatCurrency(emp.payable_salary)}
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>

            {/* Totals */}
            {filtered.length > 0 && (
              <tfoot className="border-t-2 border-gray-200 bg-gray-100/40">
                <tr>
                  <td colSpan={3}
                    className="px-4 py-3 text-xs font-bold text-black
                               uppercase tracking-wide">
                    Totals
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-400">
                    {filtered.reduce((s, e) => s + e.present_count, 0)}
                  </td>
                  <td className="px-4 py-3 font-bold text-red-400">
                    {filtered.reduce((s, e) => s + e.absent_count, 0)}
                  </td>
                  <td className="px-4 py-3 font-bold text-blue-400">
                    {filtered.reduce((s, e) => s + e.half_day_count, 0)}
                  </td>
                  <td className="px-4 py-3 font-bold text-blue-400">
                    {filtered.reduce((s, e) => s + e.leave_count, 0)}
                  </td>
                  <td />
                  <td />
                  <td className="px-4 py-3 font-bold text-black">
                    {formatCurrency(
                      filtered.reduce((s, e) => s + (e.monthly_salary || 0), 0)
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-blue-400 text-base">
                    {formatCurrency(
                      filtered.reduce((s, e) => s + (e.payable_salary || 0), 0)
                    )}
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
      reportType="attendance"
      month={month}
      year={year}
      reportName={`Attendance Report - ${monthName(month)} ${year}`}
    />
    </>
  )
}