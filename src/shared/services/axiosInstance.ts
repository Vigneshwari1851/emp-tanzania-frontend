import axios, { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/rafiki';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding the bearer token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = sessionStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors (like 401, 403)
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {

    if (error.response) {
      const { status, data } = error.response;
      const message = (data as any)?.message || 'An error occurred';

      if (status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        if (!window.location.pathname.includes('/login')) {
          // Don't redirect on public pages (survey take, careers, candidate portal)
          const publicPaths = ['/surveys/take/', '/careers', '/candidate/portal'];
          const isPublicPage = publicPaths.some(p => window.location.pathname.includes(p));
          if (isPublicPage) {
            return Promise.reject(error);
          }

          // Build tenant-aware login URL
          let loginUrl = '/login';
          try {
            const storedUser = sessionStorage.getItem('user');
            if (storedUser) {
              const parsed = JSON.parse(storedUser);
              if (parsed?.orgSlug && parsed.orgSlug !== 'undefined' && parsed.orgSlug !== 'null') {
                loginUrl = `/${parsed.orgSlug}/login`;
              }
            }
          } catch {}

          // Added: Resolve loginUrl relative to the app base path (e.g. /rafiki/)
          const baseUrl = import.meta.env.BASE_URL || '/';
          const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
          const cleanLoginPath = loginUrl.startsWith('/') ? loginUrl.slice(1) : loginUrl;
          const finalLoginUrl = `${cleanBaseUrl}${cleanLoginPath}`;

          // Added: check if the session was replaced/invalidated elsewhere
          if (message === 'Session expired. Please login again.') {
            window.location.href = `${finalLoginUrl}?single_device=true`;
          } else {
            const isSessionActive = sessionStorage.getItem('is_session_active');
            if (isSessionActive) {
              window.location.href = `${finalLoginUrl}?expired=true`;
            } else {
              window.location.href = finalLoginUrl;
            }
          }
        }
        sessionStorage.removeItem('is_session_active');
      } else if (status === 403) {
        toast.error(`Access Denied: ${message}`);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
