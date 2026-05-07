import { useState } from 'react'
import BillsRepo from '../../../../services/repository/Manager/BillsRepo'
import { extractError } from '../../../../utils/helpers'

export default function SendBillModal({ isOpen, onClose, billId, billNumber }) {
  const [email, setEmail] = useState('devanshudandekar5@gmail.com')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSend = async () => {
    try {
      if (!email.trim()) {
        setError('Please enter a valid email address')
        return
      }

      setLoading(true)
      setError('')
      setSuccess(false)

      await BillsRepo.sendViaEmail({
        billId,
        recipientEmail: email,
      })

      setSuccess(true)
      setTimeout(() => {
        setEmail('devanshudandekar5@gmail.com')
        setSuccess(false)
        onClose()
      }, 2000)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Send Bill via Email</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bill: #{billNumber}
          </label>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter recipient email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            Bill sent successfully!
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Bill'}
          </button>
        </div>
      </div>
    </div>
  )
}
