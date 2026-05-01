/*
 * File: frontend/src/pages/superadmin/Users.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useCallback, useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { superadminApi } from "../../lib/api";

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  club_id?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const clubFilter = "";
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchUsers = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    superadminApi
      .listUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        club_id: clubFilter || undefined,
      })
      .then((res) => setUsers(res.data))
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setLoadError("Je sessie is verlopen. Log opnieuw in om gebruikers te laden.");
          return;
        }
        setLoadError("Gebruikers konden niet worden geladen.");
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [search, roleFilter, clubFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchUsers();
    }, 300);
  };

  const handleClearSearch = () => {
    setSearch("");
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    fetchUsers();
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await superadminApi.updateUser(userId, { is_active: !currentActive });
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_active: !currentActive } : u)));
    } catch (err) {
      console.error(err);
      alert("Failed to update user");
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      vereniging_admin: "bg-purple-100 text-purple-800",
      planner: "bg-blue-100 text-blue-800",
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Gebruikers</h2>

      {loadError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Zoek op naam of email..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle rollen</option>
            <option value="vereniging_admin">Vereniging Admin</option>
            <option value="planner">Planner</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Naam</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vereniging</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Laatste Login</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acties</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-4 whitespace-nowrap">{user.full_name || "-"}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-gray-500">{user.email}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                    {user.club_id ? (
                      <Link to={`/clubs/${user.club_id}`} className="text-blue-600 hover:underline">
                        Bekijk
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString("nl-NL")
                      : "Nooit"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        user.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.is_active ? "Actief" : "Inactief"}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(user.id, user.is_active)}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      {user.is_active ? "Deactiveren" : "Activeren"}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Geen gebruikers gevonden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}