import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { tenantApi } from "../../lib/api";

interface DashboardRonde {
  id: string;
  competitie_id: string;
  competitie_naam: string;
  datum: string;
  status: string;
  is_inhaalronde: boolean;
  teams_zonder_baan: number;
  totaal_teams: number;
  week_nummer: number | null;
}

interface DashboardActie {
  id: string;
  type: string;
  titel: string;
  beschrijving: string;
  prioriteit: string;
  ronde_id: string | null;
  competitie_id: string | null;
  url: string;
}

interface DashboardCompetitieVoortgang {
  id: string;
  naam: string;
  speeldag: string;
  totaal_rondes: number;
  gepubliceerde_rondes: number;
  percentage: number;
  start_datum: string;
  eind_datum: string;
}

interface DashboardWaarschuwing {
  type: string;
  titel: string;
  bericht: string;
  prioriteit: string;
  url: string | null;
}

interface DashboardData {
  club: {
    id: string;
    naam: string;
    slug: string;
    status: string;
    trial_ends_at: string | null;
  };
  gebruiker: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  komende_rondes: DashboardRonde[];
  acties: DashboardActie[];
  competities_voortgang: DashboardCompetitieVoortgang[];
  waarschuwingen: DashboardWaarschuwing[];
  statistieken: {
    totaal_banen: number;
    totaal_teams: number;
    totaal_gebruikers: number;
    aantal_competities: number;
    open_acties: number;
  };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    concept: "bg-amber-100 text-amber-800 border-amber-300",
    gepubliceerd: "bg-green-100 text-green-800 border-green-300",
  };
  const labels: Record<string, string> = {
    concept: "Concept",
    gepubliceerd: "Gepubliceerd",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || "bg-gray-100 text-gray-800"}`}>
      {labels[status] || status}
    </span>
  );
}

function getPriorityColor(prioriteit: string) {
  switch (prioriteit) {
    case "hoog":
      return "text-red-600";
    case "medium":
      return "text-amber-600";
    case "laag":
      return "text-gray-500";
    default:
      return "text-gray-500";
  }
}

export default function TenantDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tenantApi
      .getDashboard()
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Kon dashboard niet laden. Probeer later opnieuw.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="text-xl">Dashboard wordt geladen...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="text-red-400 text-xl">{error || "Kon dashboard niet laden"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="p-6 max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welkom, {data.gebruiker.full_name || data.gebruiker.email}
          </h1>
          <p className="text-lg text-gray-300">
            Overzicht van {data.club.naam}
          </p>
        </header>

        {data.waarschuwingen.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Let op</h2>
            <div className="space-y-3">
              {data.waarschuwingen.map((waarschuwing, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    waarschuwing.prioriteit === "hoog"
                      ? "bg-red-900/30 border-red-600"
                      : waarschuwing.prioriteit === "medium"
                      ? "bg-amber-900/30 border-amber-600"
                      : "bg-blue-900/30 border-blue-600"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{waarschuwing.titel}</h3>
                      <p className="text-base mt-1">{waarschuwing.bericht}</p>
                    </div>
                    {waarschuwing.url && (
                      <Link
                        to={waarschuwing.url}
                        className="ml-4 px-4 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors whitespace-nowrap"
                      >
                        Bekijk
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Statistieken</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-base mb-1">Banen</p>
              <p className="text-3xl font-bold">{data.statistieken.totaal_banen}</p>
            </div>
            <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-base mb-1">Teams</p>
              <p className="text-3xl font-bold">{data.statistieken.totaal_teams}</p>
            </div>
            <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-base mb-1">Gebruikers</p>
              <p className="text-3xl font-bold">{data.statistieken.totaal_gebruikers}</p>
            </div>
            <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-base mb-1">Competities</p>
              <p className="text-3xl font-bold">{data.statistieken.aantal_competities}</p>
            </div>
            <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-base mb-1">Open acties</p>
              <p className={`text-3xl font-bold ${data.statistieken.open_acties > 0 ? "text-amber-400" : ""}`}>
                {data.statistieken.open_acties}
              </p>
            </div>
          </div>
        </section>

        {data.competities_voortgang.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Competitievoortgang</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.competities_voortgang.map((comp) => (
                <div key={comp.id} className="bg-gray-800 p-5 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-semibold">{comp.naam}</h3>
                      <p className="text-gray-400 text-base">{comp.speeldag}</p>
                    </div>
                    <span className="text-2xl font-bold text-green-400">{comp.percentage}%</span>
                  </div>
                  <div className="mb-3">
                    <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${comp.percentage}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-base text-gray-300">
                    {comp.gepubliceerde_rondes} van {comp.totaal_rondes} speelrondes gepubliceerd
                  </p>
                  <Link
                    to={`/competities/${comp.id}`}
                    className="mt-4 block w-full text-center px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                  >
                    Bekijk competitie
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.komende_rondes.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Aankomende speelrondes</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-700">
                    <th className="pb-3 text-lg font-semibold text-gray-300 pr-4">Datum</th>
                    <th className="pb-3 text-lg font-semibold text-gray-300 pr-4">Competitie</th>
                    <th className="pb-3 text-lg font-semibold text-gray-300 pr-4">Status</th>
                    <th className="pb-3 text-lg font-semibold text-gray-300 pr-4">Teams zonder baan</th>
                    <th className="pb-3 text-lg font-semibold text-gray-300">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {data.komende_rondes.map((ronde) => (
                    <tr key={ronde.id} className="border-b border-gray-800">
                      <td className="py-4 pr-4">
                        <div className="text-lg font-medium">{formatDate(ronde.datum)}</div>
                        {ronde.week_nummer && (
                          <div className="text-base text-gray-400">Week {ronde.week_nummer}</div>
                        )}
                        {ronde.is_inhaalronde && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-purple-900 text-purple-200 text-sm rounded">
                            Inhaalronde
                          </span>
                        )}
                      </td>
                      <td className="py-4 pr-4 text-lg">{ronde.competitie_naam}</td>
                      <td className="py-4 pr-4">{getStatusBadge(ronde.status)}</td>
                      <td className="py-4 pr-4">
                        {ronde.teams_zonder_baan > 0 ? (
                          <span className="text-amber-400 font-semibold text-lg">
                            {ronde.teams_zonder_baan} van {ronde.totaal_teams}
                          </span>
                        ) : (
                          <span className="text-green-400 font-semibold text-lg">
                            Alle teams toegewezen
                          </span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-2">
                          {ronde.status === "concept" && (
                            <Link
                              to={`/competities/${ronde.competitie_id}/planning/${ronde.id}`}
                              className="px-4 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-medium transition-colors text-center min-w-[120px]"
                            >
                              Toewijzen
                            </Link>
                          )}
                          <Link
                            to={`/competities/${ronde.competitie_id}/rondes/${ronde.id}`}
                            className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-center min-w-[100px]"
                          >
                            Bekijken
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data.acties.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Openstaande acties</h2>
            <div className="space-y-3">
              {data.acties.map((actie) => (
                <div
                  key={actie.id}
                  className="bg-gray-800 p-5 rounded-lg border border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-base font-medium ${getPriorityColor(actie.prioriteit)}`}>
                          {actie.prioriteit === "hoog" && "⚠️ "}
                          {actie.prioriteit === "medium" && "⏰ "}
                          {actie.titel}
                        </span>
                      </div>
                      <p className="text-base text-gray-300">{actie.beschrijving}</p>
                    </div>
                    {actie.url && (
                      <Link
                        to={actie.url}
                        className="ml-4 px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors whitespace-nowrap min-h-[48px] flex items-center"
                      >
                        Actie ondernemen
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.komende_rondes.length === 0 && data.acties.length === 0 && (
          <section className="mb-8">
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
              <h2 className="text-2xl font-semibold mb-3">Alles up-to-date!</h2>
              <p className="text-lg text-gray-300">
                Er zijn geen openstaande acties. U kunt rustig achterover leunen.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}