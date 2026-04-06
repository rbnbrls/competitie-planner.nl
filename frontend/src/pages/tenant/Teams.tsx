import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { tenantApi } from "../../lib/api";
import { Search, Plus, Upload, User, Mail, Shield, Edit, ToggleLeft, ToggleRight } from "lucide-react";
import { showToast } from "../../components/Toast";
import { 
  Button, 
  Input, 
  Modal, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell, 
  Card,
  Badge,
  Pagination,
  LoadingSkeleton,
} from "../../components";

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
      setSelectedTeamIds(teams.map(t => t.id));
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

  if (isLoading) {
    return <LoadingSkeleton rows={15} />;
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Teams {competitie ? `- ${competitie.naam}` : ""}
          </h1>
          <p className="text-gray-500 font-medium">
            Totaal: {totalTeams} teams
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowImportModal(true)}
            className="gap-2"
          >
            <Upload size={16} />
            CSV Import
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="gap-2"
          >
            <Plus size={16} />
            Team toevoegen
          </Button>
        </div>
      </div>

      {isBulkOperationProgress.inProgress && (
        <Badge variant="secondary" className="w-full py-3 flex justify-center gap-2 animate-pulse">
          {isBulkOperationProgress.text}
        </Badge>
      )}

      <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Zoeken op naam..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
          />
        </div>
        
        {selectedTeamIds.length > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 shadow-sm animate-in fade-in zoom-in-95">
            <span className="text-sm font-bold text-blue-700">{selectedTeamIds.length} geselecteerd</span>
            <div className="h-4 w-[1px] bg-blue-200 mx-2" />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleBulkActivate(true)}
              disabled={isBulkOperationProgress.inProgress}
            >
              Activeer
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleBulkActivate(false)}
              disabled={isBulkOperationProgress.inProgress}
            >
              Deactiveer
            </Button>
          </div>
        )}
      </Card>

      {/* Desktop View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 w-4 h-4 text-blue-600 focus:ring-blue-600"
                  checked={selectedTeamIds.length > 0 && selectedTeamIds.length === teams.length}
                  onChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Teamnaam</TableHead>
              <TableHead>Captain</TableHead>
              <TableHead>Speelklasse</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id} className={!team.actief ? "bg-gray-50/50" : ""}>
                <TableCell>
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 w-4 h-4 text-blue-600 focus:ring-blue-600"
                    checked={selectedTeamIds.includes(team.id)}
                    onChange={(e) => handleSelectTeam(e, team.id)}
                  />
                </TableCell>
                <TableCell className="font-semibold text-gray-900">{team.naam}</TableCell>
                <TableCell>
                  {team.captain_naam ? (
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        <User size={13} className="text-gray-400" />
                        {team.captain_naam}
                      </div>
                      {team.captain_email && (
                        <div className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Mail size={13} className="text-gray-400" />
                          {team.captain_email}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs italic">Geen captain</span>
                  )}
                </TableCell>
                <TableCell>
                  {team.speelklasse ? (
                    <Badge variant="outline" className="font-normal">{team.speelklasse}</Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={team.actief ? "success" : "default"}>
                    {team.actief ? "Actief" : "Inactief"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(team)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={team.actief ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-green-500 hover:text-green-600 hover:bg-green-50"}
                      onClick={() => team.actief ? handleDeactivate(team) : handleActivate(team)}
                    >
                      {team.actief ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {teams.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-gray-500">
                  Nog geen teams toegevoegd.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center gap-2 px-1">
          <input 
            type="checkbox" 
            id="mobile-select-all"
            className="rounded border-gray-300 w-5 h-5 text-blue-600"
            checked={selectedTeamIds.length > 0 && selectedTeamIds.length === teams.length}
            onChange={handleSelectAll}
          />
          <label htmlFor="mobile-select-all" className="text-sm font-medium text-gray-700">Selecteer alle teams</label>
        </div>
        {teams.map((team) => (
          <Card key={team.id} className={!team.actief ? "bg-gray-50/80" : ""}>
            <div className="p-4 flex gap-4">
              <div className="pt-0.5">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 w-5 h-5 text-blue-600"
                  checked={selectedTeamIds.includes(team.id)}
                  onChange={(e) => handleSelectTeam(e, team.id)}
                />
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{team.naam}</h3>
                    {team.speelklasse && (
                      <Badge variant="outline" className="mt-1 font-normal">{team.speelklasse}</Badge>
                    )}
                  </div>
                  <Badge variant={team.actief ? "success" : "default"}>
                    {team.actief ? "Actief" : "Inactief"}
                  </Badge>
                </div>

                {team.captain_naam && (
                  <div className="space-y-1 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                       <User size={14} className="text-gray-400" />
                       {team.captain_naam}
                    </div>
                    {team.captain_email && (
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <Mail size={14} className="text-gray-400" />
                        {team.captain_email}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="secondary"
                    className="flex-1 h-11"
                    onClick={() => handleEdit(team)}
                  >
                    Bewerken
                  </Button>
                  <Button
                    variant={team.actief ? "danger" : "primary"}
                    className="flex-1 h-11"
                    onClick={() => team.actief ? handleDeactivate(team) : handleActivate(team)}
                  >
                    {team.actief ? "Deactiveer" : "Activeer"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {teams.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            Nog geen teams toegevoegd.
          </div>
        )}
      </div>

      <Pagination 
        currentPage={page} 
        totalPages={totalPages} 
        onPageChange={handlePageChange} 
        isDisabled={isLoading} 
      />

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingTeam ? "Team bewerken" : "Team toevoegen"}
        footer={
          <>
            <Button 
              variant="secondary" 
              onClick={() => { setShowModal(false); resetForm(); }}
            >
              Annuleren
            </Button>
            <Button 
              type="submit" 
              form="team-form" 
              isLoading={isSaving}
            >
              {editingTeam ? "Opslaan" : "Toevoegen"}
            </Button>
          </>
        }
      >
        <form id="team-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Teamnaam"
            value={formData.naam}
            onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
            required
            placeholder="Bijv. Heren 1 Zaterdag"
          />
          <Input
            label="Captain naam"
            value={formData.captain_naam}
            onChange={(e) => setFormData({ ...formData, captain_naam: e.target.value })}
            placeholder="Naam van de teamleider"
          />
          <Input
            type="email"
            label="Captain email"
            value={formData.captain_email}
            onChange={(e) => setFormData({ ...formData, captain_email: e.target.value })}
            placeholder="email@voorbeeld.nl"
          />
          <Input
            label="Speelklasse"
            value={formData.speelklasse}
            onChange={(e) => setFormData({ ...formData, speelklasse: e.target.value })}
            placeholder="Bijv. 3e klasse heren"
          />
        </form>
      </Modal>

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Teams importeren"
        maxWidth="lg"
        footer={
          <>
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowImportModal(false);
                setSelectedFile(null);
                setImportPreview([]);
              }}
            >
              Annuleren
            </Button>
            <Button 
              onClick={handleImport}
              isLoading={isSaving}
              disabled={importPreview.length === 0}
            >
              Importeren
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Selecteer CSV bestand</label>
            <div 
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/10 transition-all cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" />
              <p className="text-sm text-gray-600 font-medium">
                {selectedFile ? selectedFile.name : "Klik om te uploaden of sleep een bestand hierheen"}
              </p>
              <p className="text-xs text-gray-400 mt-1">Enkel .csv bestanden</p>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div className="bg-gray-50 border rounded-lg p-3">
               <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Verwachte kolommen:</h4>
               <div className="flex flex-wrap gap-2">
                 {["naam", "captain_naam", "captain_email", "speelklasse"].map(c => (
                   <code key={c} className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-blue-600">{c}</code>
                 ))}
               </div>
            </div>
          </div>

          {importErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700 space-y-1">
              <div className="font-bold flex items-center gap-2">
                 <Shield size={14} /> Fouten gevonden:
              </div>
              {importErrors.map((err, i) => (
                <div key={i} className="pl-6 text-xs">• {err}</div>
              ))}
            </div>
          )}

          {importPreview.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-900 px-1">Voorvertoning ({importPreview.length} teams)</h4>
              <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg shadow-inner bg-gray-50/50">
                <Table className="bg-transparent">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead>Captain</TableHead>
                      <TableHead>Klasse</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.map((team, i) => (
                      <TableRow key={i}>
                        <TableCell className="py-2.5 font-medium">{team.naam}</TableCell>
                        <TableCell className="py-2.5 text-xs text-gray-600">{team.captain_naam || "-"}</TableCell>
                        <TableCell className="py-2.5 text-xs text-gray-600">{team.speelklasse || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}