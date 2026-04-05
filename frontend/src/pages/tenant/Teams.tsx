import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { tenantApi } from "../../lib/api";

interface Team {
  id: string;
  naam: string;
  captain_naam: string | null;
  captain_email: string | null;
  speelklasse: string | null;
  actief: boolean;
}

interface Competitie {
  id: string;
  naam: string;
}

export default function TeamsPage() {
  const { competitieId } = useParams<{ competitieId: string }>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitie, setCompetitie] = useState<Competitie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<Team[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    naam: "",
    captain_naam: "",
    captain_email: "",
    speelklasse: "",
  });

  useEffect(() => {
    if (competitieId) {
      loadData();
    }
  }, [competitieId]);

  const loadData = () => {
    if (!competitieId) return;

    Promise.all([
      tenantApi.getCompetition(competitieId),
      tenantApi.listTeams(competitieId),
    ]).then(([compRes, teamsRes]) => {
      setCompetitie(compRes.data.competitie);
      setTeams(teamsRes.data.teams || []);
    }).finally(() => setIsLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!competitieId) return;

    setIsSaving(true);
    setMessage("");

    try {
      if (editingTeam) {
        await tenantApi.updateTeam(editingTeam.id, formData);
        setMessage("Team bijgewerkt");
      } else {
        await tenantApi.createTeam(competitieId, formData);
        setMessage("Team toegevoegd");
      }
      loadData();
      setShowModal(false);
      resetForm();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setMessage(error.response?.data?.detail || "Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      naam: "",
      captain_naam: "",
      captain_email: "",
      speelklasse: "",
    });
    setEditingTeam(null);
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      naam: team.naam,
      captain_naam: team.captain_naam || "",
      captain_email: team.captain_email || "",
      speelklasse: team.speelklasse || "",
    });
    setShowModal(true);
  };

  const handleDeactivate = async (team: Team) => {
    if (!confirm(`Weet je zeker dat je team "${team.naam}" wilt deactiveren?`)) return;

    try {
      await tenantApi.updateTeam(team.id, { actief: false });
      setMessage("Team gedeactiveerd");
      loadData();
    } catch {
      setMessage("Fout bij deactiveren");
    }
  };

  const handleActivate = async (team: Team) => {
    try {
      await tenantApi.updateTeam(team.id, { actief: true });
      setMessage("Team geactiveerd");
      loadData();
    } catch {
      setMessage("Fout bij activeren");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !competitieId) return;

    setSelectedFile(file);
    setImportErrors([]);

    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());

    const preview: Team[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length < 1 || !values[0]) continue;

      const naamIndex = headers.indexOf("naam");
      const captainIndex = headers.indexOf("captain_naam");
      const emailIndex = headers.indexOf("captain_email");
      const klasseIndex = headers.indexOf("speelklasse");

      if (naamIndex === -1) {
        errors.push(`Regel ${i + 1}: kolom "naam" ontbreekt`);
        continue;
      }

      preview.push({
        id: `preview-${i}`,
        naam: values[naamIndex] || "",
        captain_naam: captainIndex !== -1 ? values[captainIndex] || null : null,
        captain_email: emailIndex !== -1 ? values[emailIndex] || null : null,
        speelklasse: klasseIndex !== -1 ? values[klasseIndex] || null : null,
        actief: true,
      });
    }

    setImportPreview(preview);
    setImportErrors(errors);
  };

  const handleImport = async () => {
    if (!selectedFile || !competitieId) return;

    setIsSaving(true);
    try {
      await tenantApi.importTeams(competitieId, selectedFile);
      setMessage("Teams geïmporteerd");
      setShowImportModal(false);
      setSelectedFile(null);
      setImportPreview([]);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setMessage(error.response?.data?.detail || "Fout bij importeren");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTeams = () => {
    if (!searchTerm) return teams;
    const term = searchTerm.toLowerCase();
    return teams.filter(
      (t) =>
        t.naam.toLowerCase().includes(term) ||
        t.captain_naam?.toLowerCase().includes(term)
    );
  };

  if (isLoading) {
    return <div className="p-4">Laden...</div>;
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Teams {competitie ? `- ${competitie.naam}` : ""}
          </h1>
          <p className="text-gray-600 mt-1">
            Totaal: {teams.length} teams
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            CSV Import
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Team toevoegen
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes("Fout") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {message}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Zoeken op naam..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md w-full max-w-xs"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Teamnaam
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Captain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Speelklasse
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTeams().map((team) => (
              <tr key={team.id} className={!team.actief ? "bg-gray-50" : ""}>
                <td className="px-6 py-4 whitespace-nowrap">{team.naam}</td>
                <td className="px-6 py-4">
                  {team.captain_naam && (
                    <div>
                      <div>{team.captain_naam}</div>
                      {team.captain_email && (
                        <div className="text-sm text-gray-500">
                          {team.captain_email}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {team.speelklasse || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      team.actief
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {team.actief ? "Actief" : "Inactief"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => handleEdit(team)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Bewerken
                  </button>
                  {team.actief ? (
                    <button
                      onClick={() => handleDeactivate(team)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Deactiveren
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(team)}
                      className="text-green-600 hover:text-green-800"
                    >
                      Activeren
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {teams.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nog geen teams toegevoegd. Voeg teams toe of importeer ze via CSV.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingTeam ? "Team bewerken" : "Team toevoegen"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teamnaam *
                  </label>
                  <input
                    type="text"
                    value={formData.naam}
                    onChange={(e) =>
                      setFormData({ ...formData, naam: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Captain naam
                  </label>
                  <input
                    type="text"
                    value={formData.captain_naam}
                    onChange={(e) =>
                      setFormData({ ...formData, captain_naam: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Captain email
                  </label>
                  <input
                    type="email"
                    value={formData.captain_email}
                    onChange={(e) =>
                      setFormData({ ...formData, captain_email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Speelklasse
                  </label>
                  <input
                    type="text"
                    value={formData.speelklasse}
                    onChange={(e) =>
                      setFormData({ ...formData, speelklasse: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Bijv. 3e klasse heren"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Opslaan..." : "Opslaan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Teams importeren (CSV)</h2>

            <div className="mb-4">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-sm text-gray-500 mt-2">
                Kolommen: naam, captain_naam, captain_email, speelklasse
              </p>
            </div>

            {importErrors.length > 0 && (
              <div className="mb-4 p-3 rounded bg-red-100 text-red-700">
                {importErrors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}

            {importPreview.length > 0 && (
              <div className="mb-4 max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs">Teamnaam</th>
                      <th className="px-3 py-2 text-left text-xs">Captain</th>
                      <th className="px-3 py-2 text-left text-xs">Klasse</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {importPreview.map((team, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{team.naam}</td>
                        <td className="px-3 py-2">{team.captain_naam || "-"}</td>
                        <td className="px-3 py-2">{team.speelklasse || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFile(null);
                  setImportPreview([]);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isSaving || importPreview.length === 0}
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