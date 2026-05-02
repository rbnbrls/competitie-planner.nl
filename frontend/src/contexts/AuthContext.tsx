/*
 * File: frontend/src/contexts/AuthContext.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { authApi, tenantApi, ApiError } from "../lib/api";

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

type ThemePreset = "base" | "precision-court";

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
  refetchClub: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperadminSession, setIsSuperadminSession] = useState(false);
  const sessionRestoreAttemptedRef = useRef(false);
  const [storedClubSlug] = useState(() => localStorage.getItem("club_slug"));

  const {
    data: club,
    refetch: refetchClub,
  } = useQuery<Club>({
    queryKey: ["club", storedClubSlug],
    queryFn: async () => {
      const response = await tenantApi.getClub();
      return response.data;
    },
    enabled: !!storedClubSlug && !isSuperadminSession,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const isSuperadmin = user?.is_superadmin === true;

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme_preset") as ThemePreset | null) ?? "base";
    document.documentElement.setAttribute("data-theme", savedTheme);

    if (sessionRestoreAttemptedRef.current) {
      return;
    }

    sessionRestoreAttemptedRef.current = true;

    const token = localStorage.getItem("access_token");
    if (token) {
      const storedClubSlug = localStorage.getItem("club_slug");

      if (storedClubSlug) {
        tenantApi.me()
          .then((res) => {
            setUser({ ...res.data, club_slug: storedClubSlug, is_superadmin: false });
          })
          .catch(async (err) => {
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
              try {
                const response = await tenantApi.superadminLogin(storedClubSlug);
                const { user: superadminUser, club: superadminClub } = response.data;
                localStorage.setItem("club_slug", storedClubSlug);
                if (superadminClub) {
                  localStorage.setItem("club_id", superadminClub.id);
                }
                setUser({ ...superadminUser, club_slug: storedClubSlug });
                setIsSuperadminSession(true);
                if (superadminClub) {
                  applyClubTheme(superadminClub);
                }
              } catch {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("club_slug");
              }
            } else {
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
              localStorage.removeItem("club_slug");
            }
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

  useEffect(() => {
    if (club) {
      applyClubTheme(club);
    }
  }, [club]);

  const login = async (email: string, password: string, slug?: string) => {
    if (slug) {
      try {
        const response = await tenantApi.login(email, password, slug);
        const { access_token, refresh_token } = response.data;
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        localStorage.setItem("club_slug", slug);
        const meRes = await tenantApi.me();
        setUser({ ...meRes.data, is_superadmin: false, club_slug: slug });
        await refetchClub();
        const clubData = club || (await tenantApi.getClub()).data;
        applyClubTheme(clubData as Club);
      } catch (err) {
        const apiErr = err instanceof ApiError ? err : null;
        if (apiErr?.status === 400 && apiErr.data?.detail?.includes("superadmin")) {
          throw new Error("ongeldige inloggegevens");
        }
        throw err;
      }
    } else {
      const response = await authApi.login(email, password);
      const { access_token, refresh_token } = response.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      const meResponse = await authApi.me();

      const storedSlug = localStorage.getItem("club_slug");
      if (storedSlug) {
        try {
          const clubResponse = await tenantApi.superadminLogin(storedSlug);
          const { club: superadminClub } = clubResponse.data;
          if (superadminClub) {
            localStorage.setItem("club_id", superadminClub.id);
          }
        } catch {
          // If superadmin-login fails, continue as regular superadmin session
        }
      } else {
        localStorage.removeItem("club_id");
      }

      setUser({ ...meResponse.data, is_superadmin: true, club_slug: storedSlug || undefined });
    }
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("club_slug");
    localStorage.removeItem("club_id");
    setUser(null);
    document.documentElement.style.removeProperty("--color-primary");
    document.documentElement.style.removeProperty("--color-secondary");
    document.documentElement.style.removeProperty("--color-accent");
    document.documentElement.setAttribute("data-theme", "base");
    localStorage.removeItem("theme_preset");
  };

  return (
    <AuthContext.Provider value={{ user, club: club || null, isLoading, isSuperadmin, login, logout, refetchClub }}>
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

  const savedTheme = (localStorage.getItem("theme_preset") as ThemePreset | null) ?? "base";
  document.documentElement.setAttribute("data-theme", savedTheme);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}