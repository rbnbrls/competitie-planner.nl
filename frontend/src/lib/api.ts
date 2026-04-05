import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, null, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          });
          const newToken = response.data.access_token;
          localStorage.setItem("access_token", newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", null, {
      params: { username: email, password },
    }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

export const superadminApi = {
  getDashboard: () => api.get("/superadmin/dashboard"),
  listClubs: (params?: { status_filter?: string; search?: string; page?: number; per_page?: number }) =>
    api.get("/superadmin/clubs", { params }),
  getClub: (clubId: string) => api.get(`/superadmin/clubs/${clubId}`),
  createClub: (data: {
    naam: string;
    slug: string;
    adres?: string;
    postcode?: string;
    stad?: string;
    telefoon?: string;
    website?: string;
  }) => api.post("/superadmin/clubs", data),
  updateClub: (clubId: string, data: Record<string, unknown>) =>
    api.patch(`/superadmin/clubs/${clubId}`, data),
  listUsers: (params?: { club_id?: string; role?: string; search?: string }) =>
    api.get("/superadmin/users", { params }),
  getUser: (userId: string) => api.get(`/superadmin/users/${userId}`),
  updateUser: (userId: string, data: Record<string, unknown>) =>
    api.patch(`/superadmin/users/${userId}`, data),
};