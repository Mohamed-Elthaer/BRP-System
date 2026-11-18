import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // التوكن في httpOnly cookie
  timeout:15000, 
});

// 401 على أي endpoint غير الدخول/الملف الشخصي = الجلسة انتهت
// 401 على أي endpoint غير الدخول/الملف الشخصي = الجلسة انتهت
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || "";
    if (error.response?.status === 401 && !url.includes("/users/login") && !url.includes("/users/me")) {
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(error);
  },
);

export default api;
