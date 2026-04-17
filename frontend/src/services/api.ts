import axios from 'axios';
import { clearToken, getToken } from '../utils/authToken';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** 为 true 时 401 不清除登录态（用于蜜罐、故意输错密码等演练请求） */
    skipAuthRedirect?: boolean;
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const skip = Boolean(err?.config?.skipAuthRedirect);
    if (status === 401 && !skip) {
      try {
        clearToken();
      } catch {
        // ignore
      }
      if (location.pathname !== '/login') location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
