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
  adminExists: () => api.get("/auth/admin-exists"),
  registerAdmin: (email: string, password: string, fullName: string) =>
    api.post("/auth/register-admin", null, {
      params: { email, password, full_name: fullName },
    }),
};

export const tenantApi = {
  login: (email: string, password: string, slug: string) =>
    api.post("/tenant/login", null, {
      params: { username: email, password, slug },
    }),
  refresh: () =>
    api.post("/tenant/refresh"),
  me: () => api.get("/tenant/me"),
  getClub: () => api.get("/tenant/club"),
  getSettings: () => api.get("/tenant/settings"),
  updateSettings: (data: {
    naam?: string;
    adres?: string;
    postcode?: string;
    stad?: string;
    telefoon?: string;
    website?: string;
  }) => api.patch("/tenant/settings", data),
  getBranding: () => api.get("/tenant/branding"),
  updateBranding: (data: {
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    font_choice?: string;
  }) => api.patch("/tenant/branding", data),
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/tenant/branding/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  listBanen: () => api.get("/tenant/banen"),
  createBaan: (data: {
    nummer: number;
    naam?: string;
    verlichting_type?: string;
    overdekt?: boolean;
    prioriteit_score?: number;
  }) => api.post("/tenant/banen", data),
  updateBaan: (baanId: string, data: {
    nummer?: number;
    naam?: string;
    verlichting_type?: string;
    overdekt?: boolean;
    prioriteit_score?: number;
    actief?: boolean;
    notitie?: string;
  }) => api.patch(`/tenant/banen/${baanId}`, data),
  deleteBaan: (baanId: string) => api.delete(`/tenant/banen/${baanId}`),
  listUsers: () => api.get("/tenant/users"),
  getUser: (userId: string) => api.get(`/tenant/users/${userId}`),
  updateUser: (userId: string, data: {
    full_name?: string;
    role?: string;
    is_active?: boolean;
  }) => api.patch(`/tenant/users/${userId}`, data),
  deactivateUser: (userId: string) => api.delete(`/tenant/users/${userId}`),
  inviteUser: (data: { email: string; role: string }) =>
    api.post("/tenant/invite", data),
  acceptInvite: (token: string, password: string) =>
    api.post("/tenant/accept-invite", { token, password }),
  forgotPassword: (email: string, slug: string) =>
    api.post("/tenant/forgot-password", { email, slug }),
  resetPassword: (token: string, newPassword: string) =>
    api.post("/tenant/reset-password", { token, new_password: newPassword }),
  listCompetities: () => api.get("/tenant/competities"),
  getCompetition: (id: string) => api.get(`/tenant/competities/${id}`),
  createCompetition: (data: {
    naam: string;
    speeldag: string;
    start_datum: string;
    eind_datum: string;
  }) => api.post("/tenant/competities", data),
  updateCompetition: (id: string, data: {
    naam?: string;
    speeldag?: string;
    start_datum?: string;
    eind_datum?: string;
    actief?: boolean;
    feestdagen?: string[];
    inhaal_datums?: string[];
  }) => api.patch(`/tenant/competities/${id}`, data),
  deleteCompetition: (id: string) => api.delete(`/tenant/competities/${id}`),
  listSpeelrondes: (competitieId: string) => api.get(`/tenant/competities/${competitieId}/rondes`),
  updateSpeelronde: (rondeId: string, data: {
    datum?: string;
    status?: string;
    is_inhaalronde?: boolean;
  }) => api.patch(`/tenant/rondes/${rondeId}`, data),
  publishSpeelronde: (rondeId: string) => api.post(`/tenant/rondes/${rondeId}/publish`),
  listTeams: (competitieId: string) => api.get(`/tenant/competities/${competitieId}/teams`),
  createTeam: (competitieId: string, data: {
    naam: string;
    captain_naam?: string;
    captain_email?: string;
    speelklasse?: string;
  }) => api.post(`/tenant/competities/${competitieId}/teams`, data),
  updateTeam: (teamId: string, data: {
    naam?: string;
    captain_naam?: string;
    captain_email?: string;
    speelklasse?: string;
    actief?: boolean;
  }) => api.patch(`/tenant/teams/${teamId}`, data),
  deleteTeam: (teamId: string) => api.delete(`/tenant/teams/${teamId}`),
  importTeams: (competitieId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/tenant/competities/${competitieId}/teams/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  generateIndeling: (rondeId: string) => api.post(`/tenant/rondes/${rondeId}/genereer`),
  getRondeDetail: (rondeId: string) => api.get(`/tenant/rondes/${rondeId}`),
  getTeamsForPlanning: (competitieId: string) => api.get(`/tenant/competities/${competitieId}/teams`),
  getBanenForPlanning: () => api.get("/tenant/banen"),
  updateToewijzing: (toewijzingId: string, data: {
    team_id?: string;
    baan_id?: string;
    tijdslot_start?: string;
    tijdslot_eind?: string;
    notitie?: string;
  }) => api.patch(`/tenant/toewijzingen/${toewijzingId}`, data),
  publishRonde: (rondeId: string) => api.post(`/tenant/rondes/${rondeId}/publish`),
  depublishRonde: (rondeId: string) => api.post(`/tenant/rondes/${rondeId}/depublish`),
  getCompetitieHistorie: (competitieId: string) => api.get(`/tenant/competities/${competitieId}/historie`),
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