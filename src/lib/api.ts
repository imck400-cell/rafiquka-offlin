import axios from 'axios';

// Standard Laravel development API base URL (Artisan Serve / Laragon local domain)
const api = axios.create({
  // baseURL: 'http://localhost:8000/api',
  baseURL: 'https://api.rafiquka.com/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Automatically inject the Sanctum Session Token and active selections
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const school = localStorage.getItem('selected_school');
  if (school) {
    config.headers['X-Selected-School'] = school;
  }

  const year = localStorage.getItem('selected_year');
  if (year) {
    config.headers['X-Selected-Year'] = year;
  }

  const branch = localStorage.getItem('selected_branch');
  if (branch) {
    config.headers['X-Selected-Branch'] = branch;
  }

  return config;
});

// Handle global API responses and clear invalid sessions automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Session expired or invalidated by server. Clearing token.");
      localStorage.removeItem('auth_token');
      // Force page reload to return user to intro/login step
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;
