import { useEffect, useState } from "react";
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    superadminApi.getDashboard()
      .then(res => setData(res.data))
      .catch(err => {
        console.error("Failed to fetch dashboard data:", err);
        setError("Kon dashboardgegevens niet laden. Probeer het later opnieuw.");
      });
  }, []);

  if (error) {
    return <div className="p-4 bg-red-100 text-red-800 rounded">{error}</div>;
  }

  if (!data) {
    return <div>Laden...</div>;
  }

  const { metrics, recent_clubs, recent_logins } = data;

  const handleResetLocalDatabase = async () => {
    const confirmed = window.confirm(
      "Dit verwijdert alle verenigingen en niet-superadmin gebruikers in de lokale database. Doorgaan?"
    );
    if (!confirmed) {
      return;
    }

    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await superadminApi.resetLocalDatabase(true);
      setResetMessage(res.data?.message || "Lokale database reset voltooid.");
      const dashboardRes = await superadminApi.getDashboard();
      setData(dashboardRes.data);
    } catch (err) {
      console.error("Failed to reset local database:", err);
      setResetMessage("Reset mislukt. Controleer backend logs of probeer opnieuw.");
    } finally {
      setIsResetting(false);
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <button
          type="button"
          onClick={handleResetLocalDatabase}
          disabled={isResetting}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isResetting ? "Bezig met resetten..." : "Reset lokale database"}
        </button>
      </div>

      {resetMessage && (
        <div className="mb-6 p-3 rounded bg-blue-50 text-blue-900 border border-blue-200">
          {resetMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Totaal Verenigingen</div>
          <div className="text-2xl font-bold">{metrics.total_clubs}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Actief</div>
          <div className="text-2xl font-bold text-green-600">{metrics.active_clubs}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Trial</div>
          <div className="text-2xl font-bold text-blue-600">{metrics.trial_clubs}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Gesuspendeerd</div>
          <div className="text-2xl font-bold text-red-600">{metrics.suspended_clubs}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Totaal Gebruikers</div>
          <div className="text-2xl font-bold">{metrics.total_users}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Laatste 7 dagen</div>
          <div className="text-2xl font-bold">{metrics.active_users_last_7_days}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Nieuwste Verenigingen</h3>
          {recent_clubs.length === 0 ? (
            <p className="text-gray-500">Nog geen verenigingen</p>
          ) : (
            <ul className="space-y-3">
              {recent_clubs.map((club) => (
                <li key={club.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <div className="font-medium">{club.naam}</div>
                    <div className="text-sm text-gray-500">{club.slug}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(club.status)}`}>
                    {club.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Recente Logins</h3>
          {recent_logins.length === 0 ? (
            <p className="text-gray-500">Nog geen logins</p>
          ) : (
            <ul className="space-y-3">
              {recent_logins.map((login) => (
                <li key={login.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <div className="font-medium">{login.full_name || "Onbekend"}</div>
                    <div className="text-sm text-gray-500">{login.email}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(login.last_login).toLocaleDateString("nl-NL")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}