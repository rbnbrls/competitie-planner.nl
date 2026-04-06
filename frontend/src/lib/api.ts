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
  getDashboard: () => api.get("/tenant/dashboard"),
  getSettings: () => api.get("/tenant/settings"),
  updateSettings: (data: {
    naam?: string;
    adres?: string;
    postcode?: string;
    stad?: string;
    telefoon?: string;
    website?: string;
    max_thuisteams_per_dag?: number;
    max_banen?: number;
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
  listCompetities: (params?: { actief_only?: boolean; page?: number; size?: number }) => 
    api.get("/tenant/competities", { params }),
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
  listSpeelrondes: (competitieId: string, params?: { lazy?: boolean }) => 
    api.get(`/tenant/competities/${competitieId}/rondes`, { params }),
  getSeizoensoverzicht: (competitieId: string) => 
    api.get(`/tenant/competities/${competitieId}/seizoensoverzicht`),
  exportSeizoenPdf: (competitieId: string) => 
    api.get(`/tenant/competities/${competitieId}/seizoensoverzicht/pdf`, { responseType: "blob" }),
  exportSeizoenCsv: (competitieId: string) => 
    api.get(`/tenant/competities/${competitieId}/seizoensoverzicht/csv`, { responseType: "blob" }),
  updateSpeelronde: (rondeId: string, data: {
    datum?: string;
    status?: string;
    is_inhaalronde?: boolean;
  }) => api.patch(`/tenant/rondes/${rondeId}`, data),
  publishSpeelronde: (rondeId: string) => api.post(`/tenant/rondes/${rondeId}/publish`),
  listTeams: (competitieId: string, params?: { page?: number; size?: number; search?: string }) => 
    api.get(`/tenant/competities/${competitieId}/teams`, { params }),
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
  exportRondePdf: (rondeId: string) => api.get(`/tenant/rondes/${rondeId}/pdf`, { responseType: "blob" }),
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
  getWedstrijden: (rondeId: string) => api.get(`/tenant/wedstrijden/${rondeId}`),
  getWedstrijdenByCompetitie: (competitieId: string, params?: { status_filter?: string }) => 
    api.get("/tenant/wedstrijden", { params: { competitie_id: competitieId, ...params } }),
  createWedstrijd: (data: {
    competitie_id: string;
    ronde_id: string;
    thuisteam_id: string;
    uitteam_id: string;
    status?: string;
    speeldatum?: string;
    speeltijd?: string;
    notitie?: string;
  }) => api.post("/tenant/wedstrijden", data),
  updateWedstrijd: (wedstrijdId: string, data: {
    thuisteam_id?: string;
    uitteam_id?: string;
    status?: string;
    speeldatum?: string;
    speeltijd?: string;
    uitslag_thuisteam?: number;
    uitslag_uitteam?: number;
    notitie?: string;
  }) => api.patch(`/tenant/wedstrijden/${wedstrijdId}`, data),
  deleteWedstrijd: (wedstrijdId: string) => api.delete(`/tenant/wedstrijden/${wedstrijdId}`),
  importWedstrijden: (competitieId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/tenant/wedstrijden/competitie/${competitieId}/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getThuisPerRonde: (competitieId: string) => 
    api.get(`/tenant/wedstrijden/competitie/${competitieId}/thuis-per-ronde`),
  exportAgenda: (competitieId: string) => 
    api.get(`/tenant/wedstrijden/competitie/${competitieId}/agenda-export`, { 
      responseType: "blob" 
    }),
  validateWedstrijden: (competitieId: string) => 
    api.get(`/tenant/wedstrijden/competitie/${competitieId}/validatie`),
  getDagoverzicht: (datum: string) => api.get("/dagoverzicht", { params: { datum } }),
  getDagoverzichtConflicten: (datum: string) => api.get("/dagoverzicht/conflicten", { params: { datum } }),
  planDagoverzichtBanen: (datum: string) => api.post("/dagoverzicht/plan", null, { params: { datum } }),
  validateMaxThuisteams: (datum: string) => api.get("/dagoverzicht/validate/max-thuisteams", { params: { datum } }),
  getTijdslotConfig: (competitieId: string) => api.get(`/tenant/competities/${competitieId}/tijdslot-config`),
  updateTijdslotConfig: (competitieId: string, data: {
    standaard_starttijden?: string[];
    eerste_datum?: string;
    hergebruik_configuratie?: boolean;
    reminder_days_before?: number;
  }) => api.put(`/tenant/competities/${competitieId}/tijdslot-config`, data),
  bulkGenerateRondes: (competitieId: string, rondeIds: string[]) =>
    api.post(`/tenant/rondes/bulk-generate`, { ronde_ids: rondeIds }, { params: { competitie_id: competitieId } }),
  bulkPublishRondes: (competitieId: string, rondeIds: string[]) =>
    api.post(`/tenant/rondes/bulk-publish`, { ronde_ids: rondeIds }, { params: { competitie_id: competitieId } }),
  bulkActivateTeams: (teamIds: string[], activate: boolean) =>
    api.post("/tenant/teams/bulk-activate", { team_ids: teamIds, activate }),
  duplicateCompetitie: (competitieId: string, data: {
    new_naam: string;
    nieuwe_start_datum: string;
    nieuwe_eind_datum: string;
    copy_teams: boolean;
  }) => api.post(`/tenant/competities/${competitieId}/duplicate`, data),
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
  getMollieConfig: () => api.get("/payments/config"),
  saveMollieConfig: (apiKey: string) => api.post("/payments/config", { api_key: apiKey }),
  listPrices: () => api.get("/payments/prices"),
  savePrice: (data: {
    competitie_naam: string;
    price_small_club: number;
    price_large_club: number;
  }) => api.post("/payments/prices", data),
  listMandates: (params?: { skip?: number; limit?: number }) =>
    api.get("/payments/mandates", { params }),
};

export const paymentApi = {
  getCheckoutStatus: () => api.get("/payments/checkout-status"),
  getMandate: (clubId: string) => api.get(`/payments/mandates/${clubId}`),
  createMandate: (data: { iban: string; consumer_name: string }) =>
    api.post("/payments/mandates", data),
  verifyMandate: (mandateId: string) =>
    api.post(`/payments/mandates/${mandateId}/verify`),
  createPayment: (competitieNaam: string, webhookUrl: string) =>
    api.post("/payments/payments", { competitie_naam: competitieNaam }, { params: { webhook_url: webhookUrl } }),
};

export const onboardingApi = {
  getStatus: () => api.get("/tenant/onboarding/status"),
  saveClub: (data: {
    naam: string;
    adres?: string;
    postcode?: string;
    stad?: string;
    telefoon?: string;
    email?: string;
  }) => api.post("/tenant/onboarding/club", data),
  saveCourts: (data: {
    banen: {
      naam: string;
      ondergrond: string;
      prioriteit_score: number;
      nummer?: number;
    }[];
  }) => api.post("/tenant/onboarding/courts", data),
  saveCompetition: (data: {
    naam: string;
    speeldag: string;
    start_datum: string;
    eind_datum: string;
  }) => api.post("/tenant/onboarding/competition", data),
  saveTeams: (competitieId: string, data: {
    teams: {
      naam: string;
      captain_naam?: string;
      captain_email?: string;
      speelklasse?: string;
    }[];
  }) => api.post(`/tenant/onboarding/teams?competitie_id=${competitieId}`, data),
  complete: () => api.post("/tenant/onboarding/complete"),
  skip: () => api.post("/tenant/onboarding/skip"),
  reset: () => api.post("/tenant/onboarding/reset"),
};