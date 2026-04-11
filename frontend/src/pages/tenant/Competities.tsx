import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { tenantApi } from "../../lib/api";
import { Clock, Calendar, Settings, Copy, X } from "lucide-react";
import { useCompetities } from "../../hooks/useCompetities";
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
  Select,
  Pagination,
  LoadingSkeleton,
} from "../../components";

interface Competitie {
  id: string;
  naam: string;
  speeldag: string;
  start_datum: string;
  eind_datum: string;
  actief: boolean;
  feestdagen: string[];
  inhaal_datums: string[];
  standaard_starttijden?: string[];
  eerste_datum?: string;
  hergebruik_configuratie?: boolean;
  created_at: string;
}

interface TijdslotConfig {
  standaard_starttijden: string[];
  eerste_datum: string | null;
  hergebruik_configuratie: boolean;
  reminder_days_before: number;
}

const DAGEN = [
  { value: "maandag", label: "Maandag" },
  { value: "dinsdag", label: "Dinsdag" },
  { value: "woensdag", label: "Woensdag" },
  { value: "donderdag", label: "Donderdag" },
  { value: "vrijdag", label: "Vrijdag" },
  { value: "zaterdag", label: "Zaterdag" },
  { value: "zondag", label: "Zondag" },
];

export default function CompetitiesPage() {
  const [page, setPage] = useState(1);
  const [actiefOnly, setActiefOnly] = useState(true);
  const PAGE_SIZE = 10;

  const { 
    competities, 
    totalPages,
    isLoading, 
    createCompetitie, 
    duplicateCompetitie, 
    updateTijdslotConfig,
    isCreating,
    isDuplicating
  } = useCompetities({ page, size: PAGE_SIZE, actiefOnly });

  const [showModal, setShowModal] = useState(false);
  const [showTijdslotModal, setShowTijdslotModal] = useState(false);
  const [selectedCompetitie, setSelectedCompetitie] = useState<Competitie | null>(null);
  const [tijdslotConfig, setTijdslotConfig] = useState<TijdslotConfig>({
    standaard_starttijden: [],
    eerste_datum: null,
    hergebruik_configuratie: true,
    reminder_days_before: 3,
  });
  const [formData, setFormData] = useState({
    naam: "",
    speeldag: "maandag",
    start_datum: "",
    eind_datum: "",
  });

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState({
    new_naam: "",
    nieuwe_start_datum: "",
    nieuwe_eind_datum: "",
    copy_teams: true,
  });
  const [isBulkOperationProgress, setIsBulkOperationProgress] = useState<{inProgress: boolean, text: string}>({inProgress: false, text: ""});

  const navigate = useNavigate();

  const loadTijdslotConfig = async (competitieId: string) => {
    try {
      const res = await tenantApi.getTijdslotConfig(competitieId);
      setTijdslotConfig(res.data);
    } catch {
      setTijdslotConfig({
        standaard_starttijden: [],
        eerste_datum: null,
        hergebruik_configuratie: true,
        reminder_days_before: 3,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCompetitie(formData);
      setShowModal(false);
      setFormData({
        naam: "",
        speeldag: "maandag",
        start_datum: "",
        eind_datum: "",
      });
    } catch {
      // Error is handled in the hook's onError handler
    }
  };

  const handleOpenTijdslotConfig = (comp: Competitie) => {
    setSelectedCompetitie(comp);
    loadTijdslotConfig(comp.id);
    setShowTijdslotModal(true);
  };

  const handleSaveTijdslotConfig = async () => {
    if (!selectedCompetitie) return;
    try {
      await updateTijdslotConfig({
        id: selectedCompetitie.id,
        data: {
          standaard_starttijden: tijdslotConfig.standaard_starttijden,
          eerste_datum: tijdslotConfig.eerste_datum || undefined,
          hergebruik_configuratie: tijdslotConfig.hergebruik_configuratie,
          reminder_days_before: tijdslotConfig.reminder_days_before,
        }
      });
      setShowTijdslotModal(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleOpenDuplicate = (comp: Competitie) => {
    setSelectedCompetitie(comp);
    setDuplicateData({
      new_naam: comp.naam + " (Kopie)",
      nieuwe_start_datum: "",
      nieuwe_eind_datum: "",
      copy_teams: true,
    });
    setShowDuplicateModal(true);
  };

  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompetitie) return;
    
    setIsBulkOperationProgress({inProgress: true, text: "Competitie aan het kopiëren..."});
    
    try {
      await duplicateCompetitie({
        id: selectedCompetitie.id,
        data: duplicateData
      });
      setShowDuplicateModal(false);
    } catch {
      // Error handled in hook
    } finally {
      setIsBulkOperationProgress({inProgress: false, text: ""});
    }
  };

  const addTijdslot = () => {
    setTijdslotConfig({
      ...tijdslotConfig,
      standaard_starttijden: [...tijdslotConfig.standaard_starttijden, "19:00"],
    });
  };

  const removeTijdslot = (index: number) => {
    const newTimes = [...tijdslotConfig.standaard_starttijden];
    newTimes.splice(index, 1);
    setTijdslotConfig({ ...tijdslotConfig, standaard_starttijden: newTimes });
  };

  const updateTijdslot = (index: number, value: string) => {
    const newTimes = [...tijdslotConfig.standaard_starttijden];
    newTimes[index] = value;
    setTijdslotConfig({ ...tijdslotConfig, standaard_starttijden: newTimes });
  };

  const handleViewTeams = (competitieId: string) => {
    navigate(`/teams/${competitieId}`);
  };

  const handleViewRondes = (competitieId: string) => {
    navigate(`/rondes/${competitieId}`);
  };

  const getActiveCompetition = () => {
    return competities.find((c: Competitie) => c.actief);
  };

  if (isLoading) {
    return <LoadingSkeleton rows={10} />;
  }

  const activeComp = getActiveCompetition();

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Competities</h1>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setActiefOnly(!actiefOnly)}
          >
            {actiefOnly ? "Toon gearchiveerd" : "Verberg gearchiveerd"}
          </Button>
          {!activeComp && (
            <Button
              onClick={() => setShowModal(true)}
            >
              Competitie aanmaken
            </Button>
          )}
        </div>
      </div>

      {isBulkOperationProgress.inProgress && (
        <Badge variant="secondary" className="w-full py-3 flex justify-center gap-2 animate-pulse">
          {isBulkOperationProgress.text}
        </Badge>
      )}

      {activeComp && (
        <Card className="border-blue-200 bg-blue-50/50">
          <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <Badge variant="primary" className="mb-1">Actieve competitie</Badge>
              <h2 className="text-xl font-bold">{activeComp.naam}</h2>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <Calendar size={14} />
                {DAGEN.find((d) => d.value === activeComp.speeldag)?.label} •{" "}
                {new Date(activeComp.start_datum).toLocaleDateString("nl-NL")} t/m{" "}
                {new Date(activeComp.eind_datum).toLocaleDateString("nl-NL")}
              </div>
              {activeComp.standaard_starttijden && activeComp.standaard_starttijden.length > 0 && (
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <Clock size={12} />
                  Standaardtijden: {activeComp.standaard_starttijden.join(", ")}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleOpenTijdslotConfig(activeComp)}
                className="gap-2"
              >
                <Settings size={16} />
                Tijdslotconfig
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/historie/${activeComp.id}`)}
              >
                Historie
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewRondes(activeComp.id)}
              >
                Speelrondes
              </Button>
              <Button
                size="sm"
                onClick={() => handleViewTeams(activeComp.id)}
              >
                Teams
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Naam</TableHead>
            <TableHead>Speeldag</TableHead>
            <TableHead>Start - Eind</TableHead>
            <TableHead>Standaardtijden</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {competities.map((comp: Competitie) => (
            <TableRow key={comp.id} className={!comp.actief ? "bg-gray-50/50 overflow-hidden" : ""}>
              <TableCell className="font-medium">{comp.naam}</TableCell>
              <TableCell>
                {DAGEN.find((d) => d.value === comp.speeldag)?.label}
              </TableCell>
              <TableCell>
                {new Date(comp.start_datum).toLocaleDateString("nl-NL")} -{" "}
                {new Date(comp.eind_datum).toLocaleDateString("nl-NL")}
              </TableCell>
              <TableCell>
                {comp.standaard_starttijden && comp.standaard_starttijden.length > 0 ? (
                  <span className="text-sm text-gray-600">
                    {comp.standaard_starttijden.join(", ")}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={comp.actief ? "success" : "default"}>
                  {comp.actief ? "Actief" : "Inactief"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDuplicate(comp)}
                    title="Kopieer"
                  >
                    <Copy size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenTijdslotConfig(comp)}
                    title="Tijdslotconfig"
                  >
                    <Clock size={16} />
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => handleViewRondes(comp.id)}
                  >
                    Rondes
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => handleViewTeams(comp.id)}
                  >
                    Teams
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {competities.length === 0 && !activeComp && (
            <TableRow>
              <TableCell colSpan={6} className="h-40 text-center text-gray-500">
                Nog geen competities aangemaakt. Klik op "Competitie aanmaken" om te beginnen.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination 
        currentPage={page} 
        totalPages={totalPages} 
        onPageChange={(p) => setPage(p)} 
        isDisabled={isLoading} 
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nieuwe competitie"
        description="Maak een nieuwe competitie aan voor een nieuw seizoen."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuleren</Button>
            <Button type="submit" form="create-competition-form" isLoading={isCreating}>Aanmaken</Button>
          </>
        }
      >
        <form id="create-competition-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Naam competitie"
            placeholder="Bijv. Zomercompetitie 2025"
            value={formData.naam}
            onChange={(e) => setFormData(prev => ({ ...prev, naam: e.target.value }))}
            required
          />
          <Select
            label="Speeldag"
            value={formData.speeldag}
            onChange={(e) => setFormData(prev => ({ ...prev, speeldag: e.target.value }))}
            options={DAGEN}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Startdatum"
              value={formData.start_datum}
              onChange={(e) => setFormData(prev => ({ ...prev, start_datum: e.target.value }))}
              required
            />
            <Input
              type="date"
              label="Einddatum"
              value={formData.eind_datum}
              onChange={(e) => setFormData(prev => ({ ...prev, eind_datum: e.target.value }))}
              required
            />
          </div>
          <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
            Na het aanmaken worden alle speelrondes automatisch gegenereerd op de gekozen speeldag.
          </p>
        </form>
      </Modal>

      <Modal
        isOpen={showTijdslotModal}
        onClose={() => setShowTijdslotModal(false)}
        title={`Tijdslotconfiguratie - ${selectedCompetitie?.naam}`}
        maxWidth="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTijdslotModal(false)}>Annuleren</Button>
            <Button onClick={handleSaveTijdslotConfig} isLoading={isCreating || isDuplicating}>Opslaan</Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Standaard aanvangstijden</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tijdslotConfig.standaard_starttijden.map((tijd, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="time"
                    value={tijd}
                    onChange={(e) => updateTijdslot(index, e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTijdslot(index)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addTijdslot}
              className="w-full border-dashed"
            >
              + Tijd toevoegen
            </Button>
          </div>

          <Input
            type="date"
            label="Eerste speeldatum (optioneel)"
            helperText="Gebruik dit om de startdatum van de eerste ronde expliciet vast te leggen."
            value={tijdslotConfig.eerste_datum || ""}
            onChange={(e) =>
              setTijdslotConfig({
                ...tijdslotConfig,
                eerste_datum: e.target.value || null,
              })
            }
          />

          <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={tijdslotConfig.hergebruik_configuratie}
                onChange={(e) =>
                  setTijdslotConfig({
                    ...tijdslotConfig,
                    hergebruik_configuratie: e.target.checked,
                  })
                }
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-blue-900">Configuratie hergebruiken</span>
                <p className="text-xs text-blue-700">Pas deze tijden automatisch toe bij nieuwe seizoensplanningen.</p>
              </div>
            </label>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Reminder email</h4>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="1"
                max="14"
                className="w-24"
                value={tijdslotConfig.reminder_days_before}
                onChange={(e) => setTijdslotConfig({...tijdslotConfig, reminder_days_before: parseInt(e.target.value)})}
              />
              <span className="text-sm text-gray-600">dagen voor de wedstrijd</span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Competitie Kopiëren"
        description="Hiermee kopieer je de algemene instellingen en teams naar een nieuw seizoen."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDuplicateModal(false)}>Annuleren</Button>
            <Button type="submit" form="duplicate-form" isLoading={isDuplicating}>Kopiëren</Button>
          </>
        }
      >
        <form id="duplicate-form" onSubmit={handleDuplicate} className="space-y-4">
          <Input
            label="Nieuwe naam"
            value={duplicateData.new_naam}
            onChange={(e) => setDuplicateData({ ...duplicateData, new_naam: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Nieuwe startdatum"
              value={duplicateData.nieuwe_start_datum}
              onChange={(e) => setDuplicateData({ ...duplicateData, nieuwe_start_datum: e.target.value })}
              required
            />
            <Input
              type="date"
              label="Nieuwe einddatum"
              value={duplicateData.nieuwe_eind_datum}
              onChange={(e) => setDuplicateData({ ...duplicateData, nieuwe_eind_datum: e.target.value })}
              required
            />
          </div>
          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="copy_teams"
              checked={duplicateData.copy_teams}
              onChange={(e) => setDuplicateData({ ...duplicateData, copy_teams: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="copy_teams" className="text-sm font-medium text-gray-700 cursor-pointer">
              Neem teams over (zonder status/resultaten)
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}