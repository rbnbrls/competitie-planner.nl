import { useCallback, useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { superadminApi } from "../../lib/api";

interface Club {
  id: string;
  naam: string;
  slug: string;
  status: string;
  created_at: string;
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 25;
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchClubs = useCallback(() => {
    setIsLoading(true);
    superadminApi
      .listClubs({ search: search || undefined, status_filter: statusFilter || undefined, page, per_page: perPage })
      .then((res) => {
        setClubs(res.data);
        setTotalCount((res.data as unknown as { metadata?: { total: number } }).metadata?.total ?? res.data.length);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchClubs();
    }, 300);
  };

  const handleClearSearch = () => {
    setSearch("");
    setPage(1);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    fetchClubs();
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchClubs();
      }
    };
    const handlePopState = () => {
      fetchClubs();
    };
    const handleFocus = () => {
      fetchClubs();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchClubs]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      trial: "bg-blue-100 text-blue-800",
      suspended: "bg-red-100 text-red-800",
      inactive: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Verenigingen</h2>
        <Link
          to="/clubs/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 whitespace-nowrap"
        >
          Nieuwe Vereniging
        </Link>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Zoek op naam of slug..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle statussen</option>
            <option value="trial">Trial</option>
            <option value="active">Actief</option>
            <option value="suspended">Gesuspendeerd</option>
            <option value="inactive">Inactief</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Naam</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aangemaakt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acties</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clubs.map((club) => (
                  <tr key={club.id}>
                    <td className="px-4 py-4 whitespace-nowrap">{club.naam}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-500">{club.slug}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(club.status)}`}>
                        {club.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                      {new Date(club.created_at).toLocaleDateString("nl-NL")}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Link
                        to={`/clubs/${club.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Bekijken
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalCount > perPage && (
            <div className="flex justify-center mt-4 gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Vorige
              </button>
              <span className="px-3 py-1">Pagina {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={clubs.length < perPage}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Volgende
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}