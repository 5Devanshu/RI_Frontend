import axios from 'axios'
import store from '../app/store'
import { clearUser } from '../app/DashboardSlice'

// ─── Base Axios Instance ──────────────────────────────────────

const Connector = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// ─── Request Interceptor ──────────────────────────────────────
// Attaches JWT token to every request automatically

Connector.interceptors.request.use(
  (config) => {
    // Try Redux store first
    const state = store.getState()
    let token = state.dashboard.token
    
    // If not in Redux, try localStorage (for app initialization before Redux hydration)
    if (!token) {
      token = localStorage.getItem('raut_token')
    }

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// ─── Response Interceptor ─────────────────────────────────────
// Handles 401 globally — clears session and redirects to login

Connector.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear redux + redirect
      store.dispatch(clearUser())
      localStorage.removeItem('raut_token')
      localStorage.removeItem('raut_user')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default Connector