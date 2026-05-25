import axios from 'axios';
import store from '../app/store';
import { clearUser } from '../app/DashboardSlice';

// Point to the Raut Industries backend which proxies to BMS API
// VITE_API_BASE_URL already includes /api prefix
const BMS_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/bms`;

export const bmsConnector = axios.create({
  baseURL: BMS_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Attach JWT bearer token from Redux store OR localStorage (required by Raut backend auth middleware)
bmsConnector.interceptors.request.use(
  (config) => {
    // Try Redux store first
    const state = store.getState();
    let token = state.dashboard.token;
    
    // If not in Redux, try localStorage (for app initialization before Redux hydration)
    if (!token) {
      token = localStorage.getItem('raut_token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally
bmsConnector.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(clearUser());
      localStorage.removeItem('raut_token');
      localStorage.removeItem('raut_user');
    }
    return Promise.reject(error);
  }
);

export default bmsConnector;