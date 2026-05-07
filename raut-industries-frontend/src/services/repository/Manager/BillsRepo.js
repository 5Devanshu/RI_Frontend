import Connector from '../../Connector'
import Apis from '../../Apis'

const BillsRepo = {

  // ── Utility ────────────────────────────────────────────────
  getNextNumber: async () => {
    const response = await Connector.get(Apis.billNextNumber)
    return response.data
  },

  preview: async (payload) => {
    const response = await Connector.post(Apis.billPreview, payload)
    return response.data
  },

  // ── CRUD ───────────────────────────────────────────────────
  getAll: async (filters = {}) => {
    const response = await Connector.get(Apis.bills, { params: filters })
    return response.data
  },

  getById: async (id) => {
    const response = await Connector.get(Apis.billById(id))
    return response.data
  },

  create: async (payload) => {
    const response = await Connector.post(Apis.bills, payload)
    return response.data
  },

  update: async (id, payload) => {
    const response = await Connector.put(Apis.billById(id), payload)
    return response.data
  },

  // ── Status ─────────────────────────────────────────────────
  confirm: async (id) => {
    const response = await Connector.put(Apis.confirmBill(id))
    return response.data
  },

  cancel: async (id) => {
    const response = await Connector.put(Apis.cancelBill(id))
    return response.data
  },

  sendViaEmail: async (payload) => {
    const response = await Connector.post(Apis.sendBillEmail, payload)
    return response.data
  },
}

export default BillsRepo