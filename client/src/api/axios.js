import axios from 'axios';

const isProd = process.env.NODE_ENV === 'production';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (isProd ? '/api' : 'http://localhost:5000/api'),
  withCredentials: true,
});

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true;
      try {
        await instance.post('/auth/refresh');
        return instance(originalRequest);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default instance;