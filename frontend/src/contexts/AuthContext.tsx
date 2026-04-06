import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi, tenantApi } from "../lib/api";

interface Club {
  id: string;
  naam: string;
  slug: string;
  status: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  is_superadmin: boolean;
  club_id?: string;
  club_slug?: string;
  onboarding_completed?: boolean;
}

interface AuthContextType {
  user: User | null;
  club: Club | null;
  isLoading: boolean;
  isSuperadmin: boolean;
  login: (email: string, password: string, slug?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isSuperadmin = user?.is_superadmin === true;

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      const storedClubSlug = localStorage.getItem("club_slug");
      
      if (storedClubSlug) {
        tenantApi.getClub()
          .then((res) => {
            setClub(res.data);
            return tenantApi.me();
          })
          .then((res) => {
            setUser({ ...res.data, club_slug: storedClubSlug, is_superadmin: false });
          })
          .catch(() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("club_slug");
          })
          .finally(() => setIsLoading(false));
      } else {
        authApi.me()
          .then((res) => setUser({ ...res.data, is_superadmin: true }))
          .catch(() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
          })
          .finally(() => setIsLoading(false));
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, slug?: string) => {
    if (slug) {
      const response = await tenantApi.login(email, password, slug);
      const { access_token, refresh_token } = response.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("club_slug", slug);
      // Fetch user and club info separately after login
      const [meRes, clubRes] = await Promise.all([
        tenantApi.me(),
        tenantApi.getClub(),
      ]);
      setUser({ ...meRes.data, is_superadmin: false, club_slug: slug });
      setClub(clubRes.data);
      applyClubTheme(clubRes.data);
    } else {
      const response = await authApi.login(email, password);
      const { access_token, refresh_token } = response.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.removeItem("club_slug");
      const meResponse = await authApi.me();
      setUser({ ...meResponse.data, is_superadmin: true });
      setClub(null);
    }
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("club_slug");
    setUser(null);
    setClub(null);
    document.documentElement.style.removeProperty("--color-primary");
    document.documentElement.style.removeProperty("--color-secondary");
    document.documentElement.style.removeProperty("--color-accent");
  };

  return (
    <AuthContext.Provider value={{ user, club, isLoading, isSuperadmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function applyClubTheme(club: Club) {
  if (club.primary_color) {
    document.documentElement.style.setProperty("--color-primary", club.primary_color);
  }
  if (club.secondary_color) {
    document.documentElement.style.setProperty("--color-secondary", club.secondary_color);
  }
  if (club.accent_color) {
    document.documentElement.style.setProperty("--color-accent", club.accent_color);
  }
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}