import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { tenantApi } from "../../lib/api";
import { Loader2 } from "lucide-react";
import { showToast } from "../../components/Toast";
import { Pagination } from "../../components/Pagination";

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
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;
  const [totalTeams, setTotalTeams] = useState(0);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<Team[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isBulkOperationProgress, setIsBulkOperationProgress] = useState<{inProgress: boolean, text: string}>({inProgress: false, text: ""});

  const [formData, setFormData] = useState({
    naam: "",
    captain_naam: "",
    captain_email: "",
    speelklasse: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (competitieId) {
      setPage(1);
      loadData(1, debouncedSearch);
    }
  }, [competitieId, debouncedSearch]);

  const loadData = (pageNum = page, search = debouncedSearch) => {
    if (!competitieId) return;
    setIsLoading(true);

    tenantApi.listTeams(competitieId, { 
      page: pageNum, 
      size: PAGE_SIZE,
      search: search || undefined
    }).then((teamsRes) => {
      setTeams(teamsRes.data.items || []);
      setTotalPages(teamsRes.data.pages || 1);
      setTotalTeams(teamsRes.data.total || 0);
    }).catch(err => {
      console.error("Error loading teams:", err);
      showToast.error("Fout bij laden van teams");
    }).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (competitieId) {
       tenantApi.getCompetition(competitieId).then(res => setCompetitie(res.data.competitie));
    }
  }, [competitieId]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadData(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!competitieId) return;

    setIsSaving(true);

    try {
      if (editingTeam) {
        await tenantApi.updateTeam(editingTeam.id, formData);
        showToast.success("Team bijgewerkt");
      } else {
        await tenantApi.createTeam(competitieId, formData);
        showToast.success("Team toegevoegd");
      }
      loadData();
      setShowModal(false);
      resetForm();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast.error(error.response?.data?.detail || "Fout bij opslaan");
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
      showToast.success("Team gedeactiveerd");
      loadData();
    } catch {
      showToast.error("Fout bij deactiveren");
    }
  };

  const handleActivate = async (team: Team) => {
    try {
      await tenantApi.updateTeam(team.id, { actief: true });
      showToast.success("Team geactiveerd");
      loadData();
    } catch {
      showToast.error("Fout bij activeren");
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
      showToast.success("Teams geïmporteerd");
      setShowImportModal(false);
      setSelectedFile(null);
      setImportPreview([]);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast.error(error.response?.data?.detail || "Fout bij importeren");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTeamIds(filteredTeams().map(t => t.id));
    } else {
      setSelectedTeamIds([]);
    }
  };

  const handleSelectTeam = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.checked) {
      setSelectedTeamIds([...selectedTeamIds, id]);
    } else {
      setSelectedTeamIds(selectedTeamIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleBulkActivate = async (activate: boolean) => {
    if (selectedTeamIds.length === 0) return;
    setIsBulkOperationProgress({inProgress: true, text: `Geselecteerde teams aan het ${activate ? 'activeren' : 'deactiveren'}...`});
    
    try {
      await tenantApi.bulkActivateTeams(selectedTeamIds, activate);
      showToast.success(`Teams succesvol ${activate ? 'geactiveerd' : 'gedeactiveerd'}`);
      loadData();
      setSelectedTeamIds([]);
    } catch {
      showToast.error("Fout bij bulk operatie");
    } finally {
      setIsBulkOperationProgress({inProgress: false, text: ""});
    }
  };

  const filteredTeams = () => teams;

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
            Totaal: {totalTeams} teams
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 min-h-[44px] bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            CSV Import
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Team toevoegen
          </button>
        </div>
      </div>

      {isBulkOperationProgress.inProgress && (
        <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          <span className="text-indigo-800 font-medium">{isBulkOperationProgress.text}</span>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
        <input
          type="text"
          placeholder="Zoeken op naam..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 min-h-[44px] border border-gray-300 rounded-md w-full max-w-xs"
        />
        
        {selectedTeamIds.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center bg-blue-50 px-4 py-2 rounded-md w-full sm:w-auto">
            <span className="text-sm font-medium mr-2">{selectedTeamIds.length} geselecteerd</span>
            <button
              onClick={() => handleBulkActivate(true)}
              disabled={isBulkOperationProgress.inProgress}
              className="text-sm px-3 py-2 min-h-[44px] bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Activeer
            </button>
            <button
              onClick={() => handleBulkActivate(false)}
              disabled={isBulkOperationProgress.inProgress}
              className="text-sm px-3 py-2 min-h-[44px] bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Deactiveer
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="hidden md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 w-5 h-5"
                    checked={selectedTeamIds.length > 0 && selectedTeamIds.length === filteredTeams().length}
                    onChange={handleSelectAll}
                  />
                </th>
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
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 w-5 h-5"
                      checked={selectedTeamIds.includes(team.id)}
                      onChange={(e) => handleSelectTeam(e, team.id)}
                    />
                  </td>
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
                      className="text-blue-600 hover:text-blue-800 mr-4 min-h-[44px]"
                    >
                      Bewerken
                    </button>
                    {team.actief ? (
                      <button
                        onClick={() => handleDeactivate(team)}
                        className="text-red-600 hover:text-red-800 min-h-[44px]"
                      >
                        Deactiveren
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(team)}
                        className="text-green-600 hover:text-green-800 min-h-[44px]"
                      >
                        Activeren
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-200">
          <div className="p-4 bg-gray-50 flex items-center border-b">
            <input 
              type="checkbox" 
              className="rounded border-gray-300 w-6 h-6 mr-3"
              checked={selectedTeamIds.length > 0 && selectedTeamIds.length === filteredTeams().length}
              onChange={handleSelectAll}
            />
            <span className="text-sm font-medium text-gray-700">Selecteer alle teams</span>
          </div>
          {filteredTeams().map((team) => (
            <div key={team.id} className={`p-4 flex gap-3 ${!team.actief ? "bg-gray-50" : ""}`}>
              <div className="pt-1">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 w-6 h-6"
                  checked={selectedTeamIds.includes(team.id)}
                  onChange={(e) => handleSelectTeam(e, team.id)}
                />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold text-lg">{team.naam}</div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      team.actief
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {team.actief ? "Actief" : "Inactief"}
                  </span>
                </div>
                {team.speelklasse && (
                  <div className="text-sm text-gray-600 mb-2">Klasse: {team.speelklasse}</div>
                )}
                {team.captain_naam && (
                  <div className="text-sm bg-gray-100 p-2 rounded mb-3">
                    <span className="font-medium text-gray-700">👤 {team.captain_naam}</span>
                    {team.captain_email && (
                      <div className="text-gray-500 mt-1">✉️ {team.captain_email}</div>
                    )}
                  </div>
                )}
                <div className="flex gap-3 mt-2 border-t pt-3">
                  <button
                    onClick={() => handleEdit(team)}
                    className="flex-1 text-center py-2 bg-blue-50 text-blue-700 rounded-md text-sm font-medium active:bg-blue-100"
                  >
                    Bewerken
                  </button>
                  {team.actief ? (
                    <button
                      onClick={() => handleDeactivate(team)}
                      className="flex-1 text-center py-2 bg-red-50 text-red-700 rounded-md text-sm font-medium active:bg-red-100"
                    >
                      Deactiveren
                    </button>
                   ) : (
                    <button
                      onClick={() => handleActivate(team)}
                      className="flex-1 text-center py-2 bg-green-50 text-green-700 rounded-md text-sm font-medium active:bg-green-100"
                    >
                      Activeren
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {teams.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nog geen teams toegevoegd. Voeg teams toe of importeer ze via CSV.
          </div>
        )}
      </div>

      <Pagination 
        currentPage={page} 
        totalPages={totalPages} 
        onPageChange={handlePageChange} 
        isDisabled={isLoading} 
      />

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
                    className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-md"
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
                    className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-md"
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
                    className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-md"
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
                    className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-md"
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
                  className="px-4 py-2 min-h-[44px] text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 w-full sm:w-auto"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto"
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