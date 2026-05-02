/*
 * File: frontend/src/lib/api.ts
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import axios from "axios";

const getApiBaseUrl = () => {
  const configuredApiUrl = import.meta.env.VITE_API_URL;

  if (configuredApiUrl) {
    const normalizedUrl = configuredApiUrl.replace(/\/$/, "");
    return normalizedUrl.endsWith("/api/v1") ? normalizedUrl : `${normalizedUrl}/api/v1`;
  }

  return import.meta.env.DEV ? "http://localhost:8000/api/v1" : "/api/v1";
};

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.url?.startsWith("/tenant/") && config.url !== "/tenant/login" && config.url !== "/tenant/superadmin-login" && config.url !== "/tenant/refresh") {
    const clubId = localStorage.getItem("club_id");
    if (clubId) {
      const separator = config.url.includes("?") ? "&" : "?";
      config.url += `${separator}club_id=${clubId}`;
    }
  }
  return config;
});

// Helper: get user-friendly message for server errors
const getServerErrorMessage = (status: number): string => {
  const messages: Record<number, string> = {
    500: 'Er is een interne serverfout opgetreden. Probeer het later opnieuw.',
    502: 'De server is tijdelijk niet bereikbaar. Probeer het over een moment opnieuw.',
    503: 'De dienst is tijdelijk niet beschikbaar door onderhoud. Probeer het later opnieuw.',
    504: 'De server reageert niet op tijd. Controleer uw verbinding en probeer opnieuw.',
  };
  return messages[status] || 'Er is een serverfout opgetreden. Probeer het later opnieuw.';
};

// Helper: check if error is retryable (transient server errors)
const isRetryableError = (status?: number): boolean => {
  return status === 502 || status === 503 || status === 504;
};

export class ApiError extends Error {
  public status?: number;
  public isNetworkError?: boolean;
  public isRetryable?: boolean;
  public data?: { detail?: string };

  constructor(
    message: string,
    options?: {
      status?: number;
      isNetworkError?: boolean;
      isRetryable?: boolean;
      data?: { detail?: string };
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.isNetworkError = options?.isNetworkError;
    this.isRetryable = options?.isRetryable ?? isRetryableError(options?.status);
    this.data = options?.data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

const createApiError = (
  status: number | undefined,
  message: string,
  options?: { isNetworkError?: boolean; data?: { detail?: string } }
): ApiError => {
  return new ApiError(message, {
    status,
    isNetworkError: options?.isNetworkError,
    data: options?.data,
  });
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't intercept 401s on the login endpoints themselves
    const isLoginEndpoint = originalRequest?.url?.includes('/login');

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry && !isLoginEndpoint) {
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
      return Promise.reject(createApiError(401, 'Uw sessie is verlopen. Log opnieuw in.'));
    }

    // Handle 5xx Server Errors
    if (error.response?.status >= 500 && error.response?.status < 600) {
      const status = error.response.status;
      const friendlyMessage = getServerErrorMessage(status);

      // Retry transient errors (502, 503, 504) once
      if (isRetryableError(status) && !originalRequest._retryCount) {
        originalRequest._retryCount = 1;
        const retryDelay = status === 503 ? 2000 : 1000; // Longer delay for 503 (maintenance)
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        try {
          return await api(originalRequest);
        } catch (retryError) {
          // If retry fails, fall through to reject with user-friendly message
        }
      }

      return Promise.reject(createApiError(status, friendlyMessage, {
        data: error.response?.data,
      }));
    }

    // Handle network errors (no response from server)
    if (!error.response && error.code !== 'ECONNABORTED') {
      return Promise.reject(
        createApiError(undefined, 'Geen verbinding met de server. Controleer uw internetverbinding.', { isNetworkError: true })
      );
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(
        createApiError(undefined, 'De aanvraag duurde te lang. Probeer het opnieuw.')
      );
    }

    // Handle 4xx client errors with user-friendly messages (except 401 which is handled above)
    if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 401) {
      const status = error.response.status;
      const clientMessages: Record<number, string> = {
        400: 'Ongeldige aanvraag. Controleer uw invoer en probeer opnieuw.',
        403: 'U heeft geen toestemming voor deze actie.',
        404: 'De opgevraagde resource is niet gevonden.',
        409: 'Er is een conflict met de huidige status van de resource.',
        422: 'Ongeldige gegevens. Controleer uw invoer.',
        429: 'Te veel aanvragen. Wacht even en probeer opnieuw.',
      };
      return Promise.reject(
        createApiError(status, clientMessages[status] || 'Er is een fout opgetreden. Probeer het opnieuw.', {
          data: error.response?.data,
        })
      );
    }

    // For all other errors, pass through with minimal transformation
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) => {
    const data = new URLSearchParams();
    data.append("username", email);
    data.append("password", password);
    return api.post("/auth/login", data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  adminExists: () => api.get("/auth/admin-exists"),
  registerAdmin: (email: string, password: string, fullName: string) =>
    api.post("/auth/register-admin", { email, password, full_name: fullName }),
};

export const tenantApi = {
  login: (email: string, password: string, slug: string) => {
    const data = new URLSearchParams();
    data.append("username", email);
    data.append("password", password);
    const queryParams = new URLSearchParams({ slug });
    return api.post(`/tenant/login?${queryParams.toString()}`, data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  superadminLogin: (slug: string) => {
    const queryParams = new URLSearchParams({ slug });
    return api.post(`/tenant/superadmin-login?${queryParams.toString()}`);
  },
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
    competitie_type?: string;
    poule_grootte?: number;
    aantal_speeldagen?: number;
    speelvorm?: string;
    leeftijdscategorie?: string;
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
  getSnapshots: (rondeId: string) => api.get(`/tenant/rondes/${rondeId}/snapshots`),
  herstellSnapshot: (rondeId: string, snapshotId: string) =>
    api.post(`/tenant/rondes/${rondeId}/snapshots/${snapshotId}/herstel`),
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
  getCompetitieTemplates: () => api.get("/tenant/competities/templates"),
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
  getWeather: () => api.get("/tenant/dashboard/weather"),
  markAfgelast: (rondeId: string, stuurEmails = true) =>
    api.post(`/tenant/rondes/${rondeId}/afgelast`, { stuur_emails: stuurEmails }),
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
    admin_email?: string;
    admin_full_name?: string;
    adres?: string;
    postcode?: string;
    stad?: string;
    telefoon?: string;
    website?: string;
    max_banen?: number;
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
  resetLocalDatabase: (confirm = true) =>
    api.post("/superadmin/reset-local-database", { confirm }),
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