import axios from 'axios';

function isIpOrLocalhost(hostname) {
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return true;
  if (hostname.includes(':')) return true;
  return false;
}

function normalizeBase(url) {
  if (!url) return '';
  return String(url).replace(/\/+$/, '');
}

function ensureApiNamespace(url) {
  if (!url) return '';
  if (url.endsWith('/api')) return url;
  return `${url}/api`;
}

function resolveApiBaseUrl() {
  const configuredApiUrl = ensureApiNamespace(normalizeBase(import.meta.env.VITE_API_URL));

  if (typeof window === 'undefined') {
    return configuredApiUrl || 'http://api.localhost/api';
  }

  const { hostname, origin } = window.location;

  // Local/IP testing: use same-origin reverse-proxy path instead of api.<domain>
  if (isIpOrLocalhost(hostname)) {
    return `${origin}/backend/api`;
  }

  return configuredApiUrl || `${origin}/backend/api`;
}

// Create axios instance
const API = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API Service Functions
export const apiService = {
  // Health check
  health: () => API.get('/health'),

  // Orders
  orders: {
    create: (orderData) => API.post('/orders', orderData),
    createLanding: (orderData) => API.post('/orders/landing', orderData),
    getById: (id) => API.get(`/orders/${id}`),
    getQR: (id) => API.get(`/orders/${id}/qr`),
  },

  // Reviews
  reviews: {
    create: (reviewData) => API.post('/reviews', reviewData),
    getAll: () => API.get('/reviews'),
    getPhoto: (id) => API.get(`/reviews/photo/${id}`),
  },

  // Authentication
  auth: {
    login: (credentials) => API.post('/auth/login', credentials),
    init: () => API.post('/auth/init'),
  },

  // Staff
  staff: {
    getAll: () => API.get('/staff'),
  },

  // Products (Public)
  products: {
    getPublic: () => API.get('/products/public'),
    getBySlug: (slug) => API.get(`/products/public/${slug}`),
  },

  // Coupons (Public)
  coupons: {
    validate: ({ couponCode, subtotal }) => API.post('/coupons/validate', { couponCode, subtotal }),
    apply: ({ couponCode }) => API.post('/coupons/apply', { couponCode }),
    getPublic: () => API.get('/coupons/public'),
  },

  // Bulk Enquiry (Custom endpoint)
  enquiry: {
    bulk: (enquiryData) => API.post('/enquiry/bulk', enquiryData),
  },

  // Contact (Generic contact form)
  contact: {
    send: (contactData) => API.post('/contact', contactData),
  },
};

export default API;