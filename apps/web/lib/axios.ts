import axios from 'axios';

// 1. Buat instance axios yang mengarah ke Backend
const api = axios.create({
  // Backend jalan di port 3000
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Interceptor Request: Otomatis tempel token dari LocalStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Interceptor Response: Handle token expired (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Jika backend menolak token (Unauthorized)
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Hapus token yang tidak valid
      localStorage.removeItem('token');
      // Opsional: Redirect ke halaman login bisa ditambahkan di sini
    }
    return Promise.reject(error);
  }
);

export default api;