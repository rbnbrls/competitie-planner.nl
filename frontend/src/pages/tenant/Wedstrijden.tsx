import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { tenantApi } from "../../lib/api";

interface Team {
  id: string;
  naam: string;
  captain_naam: string | null;
  speelklasse: string | null;
}

interface Baan {
  id: string;
  nummer: number;
  naam: string | null;
}

interface Speelronde {
  id: string;
  datum: string;
  week_nummer: number | null;
  status: string;
}

interface Wedstrijd {
  id: string;
  competitie_id: string;
  ronde_id: string;
  thuisteam_id: string;
  uitteam_id: string;
  status: string;
  speeldatum: string | null;
  speeltijd: string | null;
  uitslag_thuisteam: number | null;
  uitslag_uitteam: number | null;
  notitie: string | null;
  thuisteam: Team | null;
  uitteam: Team | null;
  baan: Baan | null;
  ronde: Speelronde | null;
}

interface Competitie {
  id: string;
  naam: string;
}

const STATUS_COLORS: Record<string, string> = {
  gepland: "bg-gray-100 text-gray-800",
  bevestigd: "bg-blue-100 text-blue-800",
  gaande: "bg-yellow-100 text-yellow-800",
  voltooid: "bg-green-100 text-green-800",
  uitgesteld: "bg-orange-100 text-orange-800",
  afgelast: "bg-red-100 text-red-800",
};

export default function WedstrijdenPage() {
  const { competitieId } = useParams<{ competitieId: string }>();
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[]>([]);
  const [competitie, setCompetitie] = useState<Competitie | null>(null);
  const [rondes, setRondes] = useState<Speelronde[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filterRonde, setFilterRonde] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showDetail, setShowDetail] = useState<Wedstrijd | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    succes: boolean;
    geimporteerd: number;
    overgeslagen: number;
    fouten: { rij: number; fout: string }[];
  } | null>(null);
  const [formData, setFormData] = useState({
    thuisteam_id: "",
    uitteam_id: "",
    ronde_id: "",
    status: "gepland",
    speeldatum: "",
    speeltijd: "",
    notitie: "",
  });

  useEffect(() => {
    if (competitieId) {
      loadData();
    }
  }, [competitieId]);

  const loadData = async () => {
    if (!competitieId) return;

    setIsLoading(true);
    try {
      const [compRes, rondesRes, teamsRes, wedRes] = await Promise.all([
        tenantApi.getCompetition(competitieId),
        tenantApi.listSpeelrondes(competitieId),
        tenantApi.listTeams(competitieId),
        tenantApi.getWedstrijdenByCompetitie(competitieId),
      ]);

      setCompetitie(compRes.data.competitie);
      setRondes(rondesRes.data.rondes || []);
      setTeams(teamsRes.data.teams || []);
      setWedstrijden(wedRes.data.wedstrijden || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !competitieId) return;

    setIsSaving(true);
    try {
      const result = await tenantApi.importWedstrijden(competitieId, selectedFile);
      setImportResult(result.data);
      if (result.data.succes) {
        setMessage(`Succesvol ${result.data.geimporteerd} wedstrijden geïmporteerd`);
        loadData();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setMessage(error.response?.data?.detail || "Fout bij importeren");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!competitieId) return;

    setIsSaving(true);
    try {
      await tenantApi.createWedstrijd({
        competitie_id: competitieId,
        thuisteam_id: formData.thuisteam_id,
        uitteam_id: formData.uitteam_id,
        ronde_id: formData.ronde_id,
        status: formData.status,
        speeldatum: formData.speeldatum || undefined,
        speeltijd: formData.speeltijd || undefined,
        notitie: formData.notitie || undefined,
      });
      setMessage("Wedstrijd toegevoegd");
      loadData();
      setFormData({
        thuisteam_id: "",
        uitteam_id: "",
        ronde_id: "",
        status: "gepland",
        speeldatum: "",
        speeltijd: "",
        notitie: "",
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setMessage(error.response?.data?.detail || "Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (wedstrijdId: string, newStatus: string) => {
    try {
      await tenantApi.updateWedstrijd(wedstrijdId, { status: newStatus });
      setMessage("Status bijgewerkt");
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setMessage(error.response?.data?.detail || "Fout bij bijwerken");
    }
  };

  const filteredWedstrijden = wedstrijden.filter((w) => {
    if (filterRonde && w.ronde_id !== filterRonde) return false;
    if (filterStatus && w.status !== filterStatus) return false;
    return true;
  });

  const groupedByRonde = filteredWedstrijden.reduce((acc, w) => {
    const key = w.ronde_id;
    if (!acc[key]) {
      acc[key] = {
        ronde: w.ronde,
        thuis: [],
        uit: [],
      };
    }
    acc[key].thuis.push(w);
    return acc;
  }, {} as Record<string, { ronde: Speelronde | null; thuis: Wedstrijd[] }>);

  if (isLoading) {
    return <div className="p-4">Laden...</div>;
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Wedstrijden {competitie ? `- ${competitie.naam}` : ""}
          </h1>
          <p className="text-gray-600 mt-1">
            Totaal: {wedstrijden.length} wedstrijden
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Import KNLTB
          </button>
          <button
            onClick={() => {
              setFormData({
                thuisteam_id: "",
                uitteam_id: "",
                ronde_id: "",
                status: "gepland",
                speeldatum: "",
                speeltijd: "",
                notitie: "",
              });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Wedstrijd toevoegen
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes("Fout") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {message}
        </div>
      )}

      <div className="mb-4 flex gap-4">
        <select
          value={filterRonde}
          onChange={(e) => setFilterRonde(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Alle speelrondes</option>
          {rondes.map((r) => (
            <option key={r.id} value={r.id}>
              Ronde {r.week_nummer} - {r.datum}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Alle statussen</option>
          <option value="gepland">Gepland</option>
          <option value="bevestigd">Bevestigd</option>
          <option value="gaande">Gaande</option>
          <option value="voltooid">Voltooid</option>
          <option value="uitgesteld">Uitgesteld</option>
          <option value="afgelast">Afgelast</option>
        </select>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedByRonde).map(([rondeId, data]) => (
          <div key={rondeId} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b">
              <h2 className="font-semibold">
                Speelronde {data.ronde?.week_nummer} - {data.ronde?.datum}
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.thuis.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => setShowDetail(w)}
                    className={`p-4 rounded-lg border cursor-pointer transition ${
                      w.status === "voltooid"
                        ? "bg-green-50 border-green-200"
                        : w.status === "gaande"
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-white border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          STATUS_COLORS[w.status] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {w.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {w.thuisteam?.naam === teams.find((t) => t.id === w.thuisteam_id)?.naam
                          ? "Thuis"
                          : "Uit"}
                      </span>
                    </div>
                    <div className="font-medium">
                      {w.thuisteam?.naam} - {w.uitteam?.naam}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {w.speeldatum && (
                        <>
                          {w.speeldatum}
                          {w.speeltijd && ` om ${w.speeltijd}`}
                        </>
                      )}
                      {w.baan && ` - Baan ${w.baan.nummer}`}
                    </div>
                    {w.uitslag_thuisteam !== null && (
                      <div className="text-sm font-semibold mt-2">
                        {w.uitslag_thuisteam} - {w.uitslag_uitteam}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {data.thuis.length === 0 && (
                <div className="text-gray-500 text-center py-4">
                  Geen wedstrijden in deze ronde
                </div>
              )}
            </div>
          </div>
        ))}
        {filteredWedstrijden.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Nog geen wedstrijden. Importeer het KNLTB-speelschema of voeg handmatig toe.
          </div>
        )}
      </div>

      {showDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Wedstrijd Details</h2>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Thuisteam</div>
                <div className="font-medium">{showDetail.thuisteam?.naam}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Uitteam</div>
                <div className="font-medium">{showDetail.uitteam?.naam}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Speelronde</div>
                <div className="font-medium">
                  {showDetail.ronde?.datum} (week {showDetail.ronde?.week_nummer})
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <select
                  value={showDetail.status}
                  onChange={(e) => handleUpdateStatus(showDetail.id, e.target.value)}
                  className="mt-1 px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="gepland">Gepland</option>
                  <option value="bevestigd">Bevestigd</option>
                  <option value="gaande">Gaande</option>
                  <option value="voltooid">Voltooid</option>
                  <option value="uitgesteld">Uitgesteld</option>
                  <option value="afgelast">Afgelast</option>
                </select>
              </div>
              {showDetail.speeldatum && (
                <div>
                  <div className="text-sm text-gray-500">Datum</div>
                  <div className="font-medium">{showDetail.speeldatum}</div>
                </div>
              )}
              {showDetail.baan && (
                <div>
                  <div className="text-sm text-gray-500">Baan</div>
                  <div className="font-medium">
                    Baan {showDetail.baan.nummer} {showDetail.baan.naam && `(${showDetail.baan.naam})`}
                  </div>
                </div>
              )}
              {showDetail.notitie && (
                <div>
                  <div className="text-sm text-gray-500">Notitie</div>
                  <div className="font-medium">{showDetail.notitie}</div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetail(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Import KNLTB Speelschema</h2>

            <div className="mb-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-sm text-gray-500 mt-2">
                Kolommen: datum, thuisteam, uitteam, thuis/uit (optioneel)
              </p>
            </div>

            {importResult && (
              <div className={`mb-4 p-3 rounded ${importResult.succes ? "bg-green-100" : "bg-red-100"}`}>
                <p className="font-medium">
                  {importResult.succes ? "Import succesvol" : "Import met fouten"}
                </p>
                <p className="text-sm">
                  Geïmporteerd: {importResult.geimporteerd}, Overgeslagen: {importResult.overgeslagen}
                </p>
                {importResult.fouten.length > 0 && (
                  <div className="mt-2 text-sm">
                    {importResult.fouten.slice(0, 5).map((e, i) => (
                      <div key={i}>
                        Rij {e.rij}: {e.fout}
                      </div>
                    ))}
                    {importResult.fouten.length > 5 && (
                      <div>...en {importResult.fouten.length - 5} meer</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImport(false);
                  setSelectedFile(null);
                  setImportResult(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedFile || isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Importeren..." : "Importeren"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}