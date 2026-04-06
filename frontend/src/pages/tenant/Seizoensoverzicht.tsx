import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { tenantApi } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

interface Ronde {
  id: string;
  datum: string;
  week_nummer: number | null;
  status: string;
}

interface SeizoensoverzichtEntry {
  ronde_id: string;
  type: "thuis" | "uit" | "vrij";
  label: string;
  details: string | null;
  status: string;
}

interface TeamRow {
  team_id: string;
  team_naam: string;
  planning: SeizoensoverzichtEntry[];
}

interface SeizoensoverzichtData {
  rondes: Ronde[];
  rows: TeamRow[];
}

export default function Seizoensoverzicht() {
  const { competitieId } = useParams<{ competitieId: string }>();
  useAuth();
  const [data, setData] = useState<SeizoensoverzichtData | null>(null);
  const [competitie, setCompetitie] = useState<{ id: string; naam: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!competitieId) return;

    setIsLoading(true);
    Promise.all([
      tenantApi.getSeizoensoverzicht(competitieId),
      tenantApi.getCompetition(competitieId)
    ])
      .then(([resGrid, resComp]) => {
        setData(resGrid.data);
        setCompetitie(resComp.data);
      })
      .catch((err) => {
        console.error(err);
        setError("Er is een fout opgetreden bij het laden van het seizoensoverzicht.");
      })
      .finally(() => setIsLoading(false));
  }, [competitieId]);

  const exportCsv = async () => {
    if (!competitieId || !competitie) return;
    try {
      const response = await tenantApi.exportSeizoenCsv(competitieId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seizoensoverzicht_${competitie.naam.toLowerCase().replace(/ /g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert("Fout bij het exporteren naar CSV.");
    }
  };

  const exportPdf = async () => {
    if (!competitieId || !competitie) return;
    try {
      const response = await tenantApi.exportSeizoenPdf(competitieId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seizoensoverzicht_${competitie.naam.toLowerCase().replace(/ /g, "_")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert("Fout bij het exporteren naar PDF.");
    }
  };

  const getStatusColor = (status: string, type: string) => {
    if (type === "vrij") return "bg-gray-100 text-gray-400";
    if (status === "gepubliceerd") return "bg-green-100 text-green-800 border-green-200";
    if (status === "concept") return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  if (isLoading) return <div className="p-8 text-center text-gray-600">Laden...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!data || !competitie) return <div className="p-8 text-center text-gray-600">Geen gegevens gevonden.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link to="/competities" className="hover:text-gray-900">Competities</Link>
            <span>/</span>
            <span className="text-gray-900">{competitie.naam}</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Seizoensoverzicht
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Beta</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel (CSV)
          </button>
          <button
            onClick={exportPdf}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-50 p-4 text-left font-semibold text-gray-900 border-r border-gray-200 min-w-[200px]">
                  Team
                </th>
                {data.rondes.map((ronde) => (
                  <th key={ronde.id} className="p-4 text-center font-semibold text-gray-900 border-r border-gray-200 min-w-[120px]">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        Ronde {ronde.week_nummer || "?"}
                      </span>
                      <span>{new Date(ronde.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.rows.map((row) => (
                <tr key={row.team_id} className="hover:bg-gray-50 transition-colors">
                  <td className="sticky left-0 z-10 bg-white p-4 font-medium text-gray-900 border-r border-gray-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                    {row.team_naam}
                  </td>
                  {row.planning.map((entry) => (
                    <td key={entry.ronde_id} className="p-2 border-r border-gray-200 text-center">
                      <Link
                        to={`/ronde/${entry.ronde_id}/${competitieId}`}
                        className={`inline-block w-full px-3 py-2 rounded-md border text-xs font-medium transition-all hover:shadow-sm ${getStatusColor(entry.status, entry.type)}`}
                      >
                        {entry.label}
                      </Link>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-gray-500 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
          <span>Gepubliceerd</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200"></div>
          <span>Concept</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div>
          <span>Leeg/Vrij</span>
        </div>
        <div className="ml-auto text-xs italic">
          Tip: Klik op een cel om direct naar de details van die ronde te gaan.
        </div>
      </div>
    </div>
  );
}
