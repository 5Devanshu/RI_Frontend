import Connector from '../../Connector'
import Apis from '../../Apis'

const ReportsRepo = {

  getDashboard: async (month, year) => {
    const response = await Connector.get(Apis.reportDashboard, {
      params: { month, year },
    })
    return response.data
  },

  getPnl: async (month, year) => {
    const response = await Connector.get(Apis.reportPnl, {
      params: { month, year },
    })
    return response.data
  },

  getGst: async (month, year) => {
    const response = await Connector.get(Apis.reportGst, {
      params: { month, year },
    })
    return response.data
  },

  getSales: async (month, year) => {
    const response = await Connector.get(Apis.reportSales, {
      params: { month, year },
    })
    return response.data
  },

  getAttendance: async (month, year) => {
    const response = await Connector.get(Apis.reportAttendance, {
      params: { month, year },
    })
    return response.data
  },

  sendViaEmail: async (payload) => {
    const response = await Connector.post(Apis.sendReportEmail, payload)
    return response.data
  },
}

export default ReportsRepo