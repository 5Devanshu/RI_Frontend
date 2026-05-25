# BMS Integration - Frontend Implementation Guide

## Overview
This document outlines the BMS integration in the Raut Industries frontend, including authentication, request management, and error handling.

## Architecture

```
Frontend (Raut Industries)
    ↓
Authentication Layer
    ├─ Redux Store (DashboardSlice)
    ├─ localStorage (raut_token, raut_user)
    └─ Axios Interceptors (Connector, bmsConnector)
    ↓
Request Management
    ├─ bmsRequestManager (deduplication & caching)
    ├─ BmsRepo (API endpoints)
    └─ Components (BmsInvoices, BmsClients, etc)
    ↓
Raut Backend (/api/bms)
    ├─ Auth Middleware (validates Raut token)
    ├─ BMS Service (manages BMS authentication)
    └─ BMS Controller (proxies requests)
    ↓
BMS Backend (https://app.octabms.com/api)
```

---

## Key Components

### 1. Token Management

**Sources (in priority order):**
1. Redux Store (`state.dashboard.token`) - Primary
2. localStorage (`raut_token`) - Fallback for initialization

**Both interceptors have this logic:**
```javascript
const state = store.getState()
let token = state.dashboard.token

if (!token) {
  token = localStorage.getItem('raut_token')
}

if (token) {
  config.headers.Authorization = `Bearer ${token}`
}
```

**Benefits:**
- Token available even before Redux hydration
- App initialization requests don't fail
- Seamless state management

---

### 2. Request Deduplication

**How it works:**

```javascript
import { withDeduplication } from '../../bmsRequestManager';

export const listBmsClientsApi = (params = {}) =>
  withDeduplication('clients', params, () =>
    bmsConnector.get('/clients', { params })
  );
```

**Key Features:**
- **Same-call deduplication**: If `listBmsClientsApi({ limit: 200 })` is called twice simultaneously, only one request is made
- **Both callers receive the same response**
- **Response is cached for 15 minutes**
- **Cache miss triggers fresh request**

**Cache behavior:**
```javascript
// Request 1: Makes API call, saves to cache
const res1 = await listBmsClientsApi({ limit: 200 });

// Request 2 (simultaneous): Waits for Request 1
const res2 = await listBmsClientsApi({ limit: 200 });

// Both get same data, only one API call made!
```

---

### 3. Authentication Guard Pattern

**Before (WRONG - causes 401 errors):**
```jsx
export default function BmsInvoices() {
  useEffect(() => { 
    loadMasters();  // Called immediately, token might not be ready!
  }, []);
}
```

**After (CORRECT - waits for auth):**
```jsx
export default function BmsInvoices() {
  const token = localStorage.getItem('raut_token');
  
  useEffect(() => {
    if (token) {  // Only load when token is available
      loadMasters();
    }
  }, [token]);  // Re-run when token changes
}
```

**Benefits:**
- ✅ No requests sent before authentication
- ✅ Components wait for token to be available
- ✅ Eliminates 401 errors from missing tokens

---

### 4. Error Handling

**Retry-After Header (429 errors):**
```javascript
if (error.response?.status === 429) {
  const retryAfter = error.response?.headers?.['retry-after'] || 5;
  // Client should wait retryAfter seconds before retrying
}
```

**Automatic Token Refresh (401 errors):**
```javascript
if (error.response?.status === 401) {
  // Token expired
  store.dispatch(clearUser());
  localStorage.removeItem('raut_token');
  localStorage.removeItem('raut_user');
  window.location.href = '/login';
}
```

---

## API Endpoints & Caching

### Master Data (Cached for 15 minutes)
- `listBmsClientsApi()` - GET /api/bms/clients
- `listBmsGstRatesApi()` - GET /api/bms/tax-rates
- `listBmsParticularsApi()` - GET /api/bms/particulars
- `listBmsPaymentModesApi()` - GET /api/bms/payment-modes
- `listBmsInvoicesApi()` - GET /api/bms/invoices
- `listBmsTemplatesApi()` - GET /api/bms/templates

### Mutations (NOT cached)
- `createBmsClientApi()` - POST /api/bms/clients
- `createBmsInvoiceApi()` - POST /api/bms/invoices
- `sendBmsInvoiceApi()` - POST /api/bms/invoices/:id/send
- `createBmsPaymentApi()` - POST /api/bms/payments

### Streaming
- `downloadBmsInvoicePdf()` - GET /api/bms/invoices/:id/pdf

---

## Common Issues & Solutions

### Issue 1: 401 Unauthorized Errors
**Cause:** Token not available when component mounts
**Solution:** Use authentication guard pattern (see #3 above)

### Issue 2: 429 Too Many Requests
**Cause:** Multiple simultaneous identical requests
**Solution:** Request deduplication automatically handles this

### Issue 3: Stale Data
**Cause:** Cached data older than 15 minutes
**Solution:** Cache automatically refreshes after TTL

### Issue 4: Need Fresh Data Immediately
**Solution:** Use `clearCacheEntry()` function
```javascript
import { clearCacheEntry } from '../../bmsRequestManager';

// Clear cache and fetch fresh data
clearCacheEntry('clients', { limit: 200 });
const freshData = await listBmsClientsApi({ limit: 200 });
```

---

## Component Integration Examples

### BmsInvoices Component
```jsx
import { useState, useEffect, useCallback } from 'react';
import {
  listBmsClientsApi,
  listBmsGstRatesApi,
  listBmsParticularsApi,
  listBmsPaymentModesApi,
  listBmsInvoicesApi,
} from '../../../../services/repository/Manager/BmsRepo';

export default function BmsInvoices() {
  const [clients, setClients] = useState([]);
  const [gstRates, setGstRates] = useState([]);
  const [particulars, setParticulars] = useState([]);
  const [payModes, setPayModes] = useState([]);
  
  // ✅ Get token to guard API calls
  const token = localStorage.getItem('raut_token');

  const loadMasters = useCallback(async () => {
    try {
      // All these requests use request deduplication automatically
      const [cRes, gRes, pRes, mRes] = await Promise.allSettled([
        listBmsClientsApi({ limit: 200 }),
        listBmsGstRatesApi(),
        listBmsParticularsApi(),
        listBmsPaymentModesApi(),
      ]);
      
      if (cRes.status === 'fulfilled') setClients(cRes.value.data?.data || []);
      if (gRes.status === 'fulfilled') setGstRates(gRes.value.data?.data || []);
      if (pRes.status === 'fulfilled') setParticulars(pRes.value.data?.data || []);
      if (mRes.status === 'fulfilled') setPayModes(mRes.value.data?.data || []);
    } catch (err) {
      console.error('Failed to load BMS masters:', err);
    }
  }, []);

  // ✅ Only load when authenticated
  useEffect(() => {
    if (token) {
      loadMasters();
    }
  }, [token]);
}
```

---

## Performance Considerations

### Request Deduplication Benefits
- Reduces API calls from 4 to 1 when loading master data simultaneously
- Prevents rate-limiting (429 errors)
- Faster app initialization

### Caching Benefits
- Master data cached for 15 minutes
- Subsequent requests return cached data instantly
- Reduces server load

### Example Timeline
```
T=0:000ms - User navigates to BmsInvoices
           - 4 useEffect hooks trigger loadMasters()
T=0:010ms - All 4 hooks call BMS APIs
           - Request deduplication kicks in
           - Only 1 request actually sent to Raut backend
T=0:050ms - Raut backend authenticates to BMS (once)
T=1:200ms - Response received, all 4 hooks get data
           - Data cached for 15 minutes

T=15:000s - User refreshes page
           - Cache expired, fresh data fetched
           - Same deduplication applies
```

---

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:8000/api  # Local development
VITE_API_BASE_URL=https://your-domain.com/api  # Production
```

---

## Testing

### Manual Testing
1. Open browser DevTools → Network tab
2. Navigate to BMS/Invoices
3. Verify:
   - No 401 errors
   - No 429 errors
   - Only 1 request per endpoint (deduplication)
   - Data loads successfully

### Automated Testing
```javascript
// Test deduplication
const res1 = listBmsClientsApi({ limit: 200 });
const res2 = listBmsClientsApi({ limit: 200 });
assert(res1 === res2);  // Same promise

// Test caching
const cached = getCachedData('clients', { limit: 200 });
assert(cached !== null);  // Data is cached
```

---

## Related Documentation
- [BMS Integration Complete](./BMS_INTEGRATION_COMPLETE.md)
- [API Integration Guide](./API.md)
- [M&D Engineering BMS Integration](../../../M%20and%20D%20Engineering/md-engineers-frontend/BMS_FRONTEND_INTEGRATION.md)
