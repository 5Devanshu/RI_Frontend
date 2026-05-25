/**
 * BMS Request Manager
 * Deduplicates simultaneous requests and implements response caching
 * to prevent rate limiting and 401 errors
 */

// Cache for master data with TTL (15 minutes)
const CACHE_TTL = 15 * 60 * 1000;
const cache = {};

// Track in-flight requests to avoid duplicates
const inflightRequests = {};

/**
 * Get cache key for a request
 */
const getCacheKey = (endpoint, params = {}) => {
  const paramsStr = JSON.stringify(params).replace(/\s/g, '');
  return `${endpoint}:${paramsStr}`;
};

/**
 * Check if cached data is still valid
 */
const isCacheValid = (cacheKey) => {
  const cached = cache[cacheKey];
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_TTL;
};

/**
 * Get cached data
 */
const getCachedData = (endpoint, params = {}) => {
  const cacheKey = getCacheKey(endpoint, params);
  if (isCacheValid(cacheKey)) {
    console.log(`📦 Using cached data for ${endpoint}`);
    return cache[cacheKey].data;
  }
  return null;
};

/**
 * Set cached data
 */
const setCachedData = (endpoint, params = {}, data) => {
  const cacheKey = getCacheKey(endpoint, params);
  cache[cacheKey] = {
    data,
    timestamp: Date.now(),
  };
};

/**
 * Deduplicate simultaneous requests
 * If same request is already in-flight, wait for it instead of making new request
 */
const withDeduplication = async (endpoint, params = {}, requestFn) => {
  const requestKey = getCacheKey(endpoint, params);

  // If request already in-flight, return that promise
  if (inflightRequests[requestKey]) {
    console.log(`⏳ Waiting for in-flight request: ${endpoint}`);
    return inflightRequests[requestKey];
  }

  // Check cache first
  const cached = getCachedData(endpoint, params);
  if (cached) {
    return cached;
  }

  // Create and track new request
  inflightRequests[requestKey] = requestFn()
    .then((data) => {
      setCachedData(endpoint, params, data);
      return data;
    })
    .finally(() => {
      // Remove from in-flight tracking
      delete inflightRequests[requestKey];
    });

  return inflightRequests[requestKey];
};

/**
 * Clear cache (useful on logout)
 */
const clearCache = () => {
  Object.keys(cache).forEach((key) => {
    delete cache[key];
  });
  console.log('✓ BMS cache cleared');
};

/**
 * Clear specific cache entry
 */
const clearCacheEntry = (endpoint, params = {}) => {
  const cacheKey = getCacheKey(endpoint, params);
  delete cache[cacheKey];
};

export { withDeduplication, getCachedData, setCachedData, clearCache, clearCacheEntry };
