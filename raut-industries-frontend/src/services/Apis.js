// ─── All API endpoint strings in one place ────────────────────
// Import this file in any repository file
// Never hardcode endpoint strings in repository files

const Apis = {

  // ── Auth ────────────────────────────────────────────────────
  login:      '/auth/login',
  getMe:      '/auth/me',

  // ── Users ───────────────────────────────────────────────────
  users:           '/users',
  userById:        (id) => `/users/${id}`,
  changePassword:  '/users/change-password/me',

  // ── GST Slabs ───────────────────────────────────────────────
  gstSlabs:        '/gst-slabs',
  gstSlabById:     (id) => `/gst-slabs/${id}`,

  // ── Charge Types ────────────────────────────────────────────
  chargeTypes:     '/charge-types',
  chargeTypeById:  (id) => `/charge-types/${id}`,

  // ── Clients ─────────────────────────────────────────────────
  clients:         '/clients',
  clientById:      (id) => `/clients/${id}`,

  // ── Products ────────────────────────────────────────────────
  products:        '/products',
  productById:     (id) => `/products/${id}`,

  // ── Bills ───────────────────────────────────────────────────
  bills:           '/bills',
  billById:        (id) => `/bills/${id}`,
  billNextNumber:  '/bills/next-number',
  billPreview:     '/bills/preview',
  confirmBill:     (id) => `/bills/${id}/confirm`,
  cancelBill:      (id) => `/bills/${id}/cancel`,
  sendBillEmail:   '/bills/send-email',

  // ── Employees ───────────────────────────────────────────────
  employees:       '/employees',
  employeeById:    (id) => `/employees/${id}`,

  // ── Attendance ──────────────────────────────────────────────
  attendance:           '/attendance',
  attendanceBulk:       '/attendance/bulk',
  attendanceById:       (id) => `/attendance/${id}`,
  attendanceSummary:    '/attendance/summary',
  attendanceDaily:      (date) => `/attendance/daily/${date}`,
  attendanceEmployee:   (id) => `/attendance/employee/${id}`,

  // ── Reports ─────────────────────────────────────────────────
  reportDashboard:  '/reports/dashboard',
  reportPnl:        '/reports/pnl',
  reportGst:        '/reports/gst',
  reportSales:      '/reports/sales',
  reportAttendance: '/reports/attendance',
  sendReportEmail:  '/reports/send-email',
}

export default Apis