/*
 * File: frontend/src/pages/tenant/RondePlanner.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { tenantApi } from "../../lib/api";

interface Baan {
  id: string;
  nummer: number;
  naam: string | null;
  prioriteit_score: number;
  overdekt: boolean;
  verlichting_type: string;
}

interface RondeRij {
  ronde_id: string;
  ronde_datum: string;
  week_nummer: number | null;
  wedstrijden: {
    id: string;
    thuisteam_id: string;
    uitteam_id: string;
    thuisteam_naam: string;
    uitteam_naam: string;
    baan_nummer: number | null;
    speeltijd: string | null;
    status: string;
  }[];
}

interface Competitie {
  id: string;
  naam: string;
}

export default function RondePlannerPage() {
  const { competitieId } = useParams<{ competitieId: string }>();
  const [rondes, setRondes] = useState<RondeRij[]>([]);
  const [competitie, setCompetitie] = useState<Competitie | null>(null);
  const [banen, setBanen] = useState<Baan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedRonde, setSelectedRonde] = useState<string>("");

  const loadData = useCallback(async () => {
    if (!competitieId) return;

    setIsLoading(true);
    try {
      const [compRes, thuisRes, banenRes] = await Promise.all([
        tenantApi.getCompetition(competitieId),
        tenantApi.getThuisPerRonde(competitieId),
        tenantApi.getBanenForPlanning(),
      ]);

      setCompetitie(compRes.data.competitie);
      setRondes(thuisRes.data.rondes || []);
      setBanen(banenRes.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [competitieId]);

  useEffect(() => {
    if (competitieId) {
      loadData();
    }
  }, [competitieId, loadData]);

  const handleExportAgenda = async () => {
    if (!competitieId) return;

    try {
      const response = await tenantApi.exportAgenda(competitieId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `competitie-agenda-${competitie?.naam || "export"}.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage("Agenda geëxporteerd");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setMessage(error.response?.data?.detail || "Fout bij exporteren");
    }
  };

  const handleExportCSV = () => {
    if (!selectedRonde) return;

    const ronde = rondes.find((r) => r.ronde_id === selectedRonde);
    if (!ronde) return;

    const headers = ["Team", "Tegenstander", "Datum", "Tijd", "Baan", "Status"];
    const rows = ronde.wedstrijden.map((w) => [
      w.thuisteam_naam,
      w.uitteam_naam,
      ronde.ronde_datum,
      w.speeltijd || "19:00",
      w.baan_nummer || "",
      w.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ronde-${ronde.ronde_datum}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setMessage("CSV geëxporteerd");
  };

  const filteredRondes = selectedRonde
    ? rondes.filter((r) => r.ronde_id === selectedRonde)
    : rondes;

  const benodigdeBanen = filteredRondes.reduce((acc, r) => {
    const count = r.wedstrijden.length;
    acc[r.ronde_datum] = count;
    return acc;
  }, {} as Record<string, number>);

  const totalBanen = Object.values(benodigdeBanen).reduce((a, b) => a + b, 0);

  if (isLoading) {
    return <div className="p-4">Laden...</div>;
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            RondePlanner {competitie ? `- ${competitie.naam}` : ""}
          </h1>
          <p className="text-gray-600 mt-1">
            Overzicht thuiswedstrijden per speelronde voor banenplanning
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportAgenda}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Exporteer Agenda
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes("Fout") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {message}
        </div>
      )}

      <div className="mb-4 flex gap-4 items-center">
        <select
          value={selectedRonde}
          onChange={(e) => setSelectedRonde(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Alle speelrondes</option>
          {rondes.map((r) => (
            <option key={r.ronde_id} value={r.ronde_id}>
              Week {r.week_nummer} - {r.ronde_datum} ({r.wedstrijden.length} wedstrijden)
            </option>
          ))}
        </select>

        {selectedRonde && (
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Exporteer CSV
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2"> Beschikbare banen</h3>
          <div className="text-3xl font-bold text-green-600">{banen.length}</div>
          <p className="text-sm text-gray-500">
            {banen.filter((b) => b.overdekt).length} overdekt,{" "}
            {banen.filter((b) => b.verlichting_type !== "geen").length} verlicht
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2"> Benodigde banen</h3>
          <div className="text-3xl font-bold text-blue-600">{totalBanen}</div>
          <p className="text-sm text-gray-500">
            Totaal aantal thuiswedstrijden
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2"> Dekking</h3>
          <div className={`text-3xl font-bold ${totalBanen <= banen.length ? "text-green-600" : "text-red-600"}`}>
            {totalBanen <= banen.length ? "Voldoende" : "Onvoldoende"}
          </div>
          <p className="text-sm text-gray-500">
            {banen.length - totalBanen} beschikbaar na aftrek
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {filteredRondes.map((ronde) => (
          <div key={ronde.ronde_id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-lg">
                  Speelronde {ronde.week_nummer} - {ronde.ronde_datum}
                </h2>
                <p className="text-sm text-gray-500">
                  {ronde.wedstrijden.length} thuiswedstrijden
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {ronde.wedstrijden.length}
                </div>
                <div className="text-sm text-gray-500">banen nodig</div>
              </div>
            </div>

            <div className="p-4">
              {ronde.wedstrijden.length > 0 ? (
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-2">Thuis</th>
                      <th className="pb-2">Uit</th>
                      <th className="pb-2">Tijd</th>
                      <th className="pb-2">Baan</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ronde.wedstrijden.map((w) => (
                      <tr key={w.id} className="hover:bg-gray-50">
                        <td className="py-3 font-medium">{w.thuisteam_naam}</td>
                        <td className="py-3">{w.uitteam_naam}</td>
                        <td className="py-3 text-gray-500">
                          {w.speeltijd || "19:00"}
                        </td>
                        <td className="py-3">
                          {w.baan_nummer ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                              Baan {w.baan_nummer}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              w.status === "voltooid"
                                ? "bg-green-100 text-green-800"
                                : w.status === "gaande"
                                ? "bg-yellow-100 text-yellow-800"
                                : w.status === "bevestigd"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {w.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  Geen thuiswedstrijden in deze ronde
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredRondes.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Nog geen wedstrijden beschikbaar. Importeer eerst het speelschema.
          </div>
        )}
      </div>
    </div>
  );
}