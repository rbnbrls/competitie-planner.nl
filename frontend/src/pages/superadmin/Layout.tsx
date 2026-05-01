/*
 * File: frontend/src/pages/superadmin/Layout.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { superadminApi } from "../../lib/api";

interface DashboardData {
  metrics: {
    total_clubs: number;
    active_clubs: number;
    trial_clubs: number;
    suspended_clubs: number;
    total_users: number;
    active_users_last_7_days: number;
  };
  recent_clubs: Array<{
    id: string;
    naam: string;
    slug: string;
    status: string;
    created_at: string;
  }>;
  recent_logins: Array<{
    id: string;
    full_name: string;
    email: string;
    club_id: string | null;
    last_login: string;
  }>;
}

export default function SuperadminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!user.is_superadmin) {
      navigate("/");
      return;
    }

    superadminApi
      .getDashboard()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-y-2 py-2 min-h-16">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">Superadmin Panel</h1>
              <div className="flex flex-wrap gap-x-1">
                <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap">
                  Dashboard
                </Link>
                <Link to="/clubs" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap">
                  Verenigingen
                </Link>
                <Link to="/users" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap">
                  Gebruikers
                </Link>
                <Link to="/payments" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap">
                  Betalingen
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm text-gray-600 truncate max-w-[180px]">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
              >
                Uitloggen
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet context={{ data }} />
      </main>
    </div>
  );
}