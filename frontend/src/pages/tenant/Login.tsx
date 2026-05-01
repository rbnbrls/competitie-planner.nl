/*
 * File: frontend/src/pages/tenant/Login.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { loginSchema, zodErrors } from "../../lib/schemas";

export default function TenantLoginPage() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("slug") || window.location.hostname.split(".")[0];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSlugValid, setIsSlugValid] = useState(true);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [clubName, setClubName] = useState("");

  useEffect(() => {
    if (slug && slug !== "localhost" && slug !== "competitie-planner") {
      setClubName(slug);
    }
  }, [slug]);

  useEffect(() => {
    const validateSlug = async () => {
      if (!slug || slug === "localhost" || slug === "competitie-planner") {
        setIsSlugValid(false);
        setError("Ongeldige vereniging in URL");
        return;
      }

      setIsCheckingSlug(true);
      setError("");

      try {
        await api.get(`/display/${slug}/actueel`);
        setIsSlugValid(true);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          const axiosErr = err as { response?: { status?: number } };
          if (axiosErr.response?.status === 404) {
            setIsSlugValid(false);
            setError("Vereniging niet gevonden");
            return;
          }
        }

        setIsSlugValid(true);
      } finally {
        setIsCheckingSlug(false);
      }
    };

    void validateSlug();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const emailValue = email || (document.getElementById("email") as HTMLInputElement)?.value || "";
    const passwordValue = password || (document.getElementById("password") as HTMLInputElement)?.value || "";

    const validation = loginSchema.safeParse({ email: emailValue, password: passwordValue });
    if (!validation.success) {
      const errs = zodErrors(validation);
      setFieldErrors({ email: errs.email, password: errs.password });
      return;
    }

    if (!isSlugValid) {
      setError("Vereniging niet gevonden");
      return;
    }

    setIsLoading(true);

    try {
      await login(emailValue, passwordValue, slug);
      navigate("/tenant/dashboard");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
        if (axiosErr.response?.status === 401) {
          setError("ongeldige inloggegevens");
        } else if (axiosErr.response?.status === 400 && axiosErr.response?.data?.detail?.includes("superadmin")) {
          setError("Gebruik het superadmin portaal voor superadmin accounts");
        } else {
          setError(axiosErr.response?.data?.detail || "Login mislukt");
        }
      } else if (err instanceof Error && err.message === "ongeldige inloggegevens") {
        setError("ongeldige inloggegevens");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        {clubName && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 capitalize">{clubName.replace("-", " ")}</h1>
            <p className="text-gray-500">Competitie Planner</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                fieldErrors.email ? "border-red-500" : "border-gray-300"
              }`}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                fieldErrors.password ? "border-red-500" : "border-gray-300"
              }`}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || isCheckingSlug || !isSlugValid}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isCheckingSlug ? "Vereniging controleren..." : isLoading ? "Inloggen..." : "Inloggen"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to={`/forgot-password?slug=${slug}`} className="text-sm text-blue-600 hover:text-blue-800">
            Wachtwoord vergeten?
          </Link>
        </div>
      </div>
    </main>
  );
}