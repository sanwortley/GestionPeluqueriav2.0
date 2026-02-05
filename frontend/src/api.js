import axios from 'axios';

const getBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.VITE_API_URL_HOST) return `https://${import.meta.env.VITE_API_URL_HOST}`;
    return 'http://localhost:8000/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            if (!window.location.pathname.startsWith('/admin/login') && window.location.pathname.startsWith('/admin')) {
                window.location.href = '/admin/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
