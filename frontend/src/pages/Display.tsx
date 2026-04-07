import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

interface DisplayToewijzing {
  baan_nummer: number;
  baan_naam: string | null;
  team_naam: string;
  tijdslot_start: string | null;
  tijdslot_eind: string | null;
  notitie: string | null;
}

interface DisplayRonde {
  id: string;
  competitie_naam: string;
  club_naam: string;
  datum: string;
  week_nummer: number | null;
  is_inhaalronde: boolean;
  toewijzingen: DisplayToewijzing[];
}

interface DisplayClub {
  naam: string;
  slug: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
}

interface DisplayResponse {
  club: DisplayClub;
  ronde: DisplayRonde | null;
}

export default function DisplayPage() {
  const { slug, token } = useParams<{ slug: string; token?: string }>();
  const [data, setData] = useState<DisplayResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  const fetchData = useCallback(async () => {
    try {
      const url = token
        ? `${API_BASE_URL}/display/${slug}/${token}`
        : `${API_BASE_URL}/display/${slug}/actueel`;
      const res = await axios.get<DisplayResponse>(url);
      setData(res.data);
      setError(null);
    } catch {
      setError("Geen actuele banenindeling beschikbaar");
    } finally {
      setIsLoading(false);
    }
  }, [slug, token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
      setCountdown(60);
    }, 60000);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-2xl text-gray-600">Laden...</div>
      </div>
    );
  }

  if (error || !data?.ronde) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Geen actieve banenindeling beschikbaar
          </h1>
          <p className="text-gray-600">
            Er is momenteel geen gepubliceerde speelronde zichtbaar.
          </p>
          <p className="text-gray-500 text-sm mt-4">
            Ververst over {countdown} seconden...
          </p>
        </div>
      </div>
    );
  }

  const { club, ronde } = data;

  const headerStyle = {
    backgroundColor: club.primary_color,
    color: club.secondary_color,
  };

  const accentColor = club.accent_color;

  return (
    <div className="min-h-screen bg-white">
      <header
        className="p-6 flex items-center gap-4"
        style={headerStyle}
      >
        {club.logo_url && (
          <img
            src={club.logo_url}
            alt={`${club.naam} logo`}
            className="h-16 w-auto"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold">{club.naam}</h1>
          <p className="text-xl opacity-90">
            {ronde.competitie_naam} - Speelronde {ronde.week_nummer}
          </p>
        </div>
        <div className="ml-auto flex gap-4">
           <Link 
             to={`/${club.slug}/kalender`} 
             className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl text-lg font-bold backdrop-blur-md transition-all border border-white/30 shadow-lg"
           >
             📅 Bekijk volledige kalender
           </Link>
        </div>
      </header>

      <main className="p-8">
        <div className="mb-4">
          <p className="text-2xl text-gray-700">
            {new Date(ronde.datum).toLocaleDateString("nl-NL", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {ronde.is_inhaalronde && (
              <span className="ml-2 text-lg text-red-600">(Inhaalronde)</span>
            )}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: accentColor }}>
                <th className="px-6 py-4 text-left text-xl font-bold text-gray-900">
                  Baan
                </th>
                <th className="px-6 py-4 text-left text-xl font-bold text-gray-900">
                  Team
                </th>
                <th className="px-6 py-4 text-left text-xl font-bold text-gray-900">
                  Tijd
                </th>
                <th className="px-6 py-4 text-left text-xl font-bold text-gray-900">
                  Notitie
                </th>
              </tr>
            </thead>
            <tbody>
              {ronde.toewijzingen.map((t, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="px-6 py-5 border-b">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-800">
                        {t.baan_nummer}
                      </span>
                      {t.baan_naam && (
                        <span className="text-lg text-gray-600">
                          - {t.baan_naam}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 border-b">
                    <span className="text-xl font-medium text-gray-900">
                      {t.team_naam}
                    </span>
                  </td>
                  <td className="px-6 py-5 border-b">
                    <span className="text-lg text-gray-700">
                      {t.tijdslot_start?.slice(0, 5) || "-"}
                      {" - "}
                      {t.tijdslot_eind?.slice(0, 5) || "-"}
                    </span>
                  </td>
                  <td className="px-6 py-5 border-b">
                    <span className="text-lg text-gray-600">{t.notitie || "-"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t flex justify-between items-center py-4 px-8 text-gray-500 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-4">
          <p className="font-bold text-gray-800">competitie-planner.nl</p>
          <span className="text-gray-300">|</span>
          <Link to={`/${club.slug}/kalender`} className="hover:text-blue-600 font-medium">📅 Bekijk volledige club-planning</Link>
        </div>
        <p className="font-medium">Indeling ververst over {countdown} seconden...</p>
      </footer>
    </div>
  );
}