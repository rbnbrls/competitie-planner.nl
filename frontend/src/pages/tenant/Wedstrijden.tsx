import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { tenantApi } from "../../lib/api";
import { 
  Trophy, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XSquare, 
  Upload, 
  Plus, 
  FileSearch, 
  Info,
  ChevronRight,
  MapPin,
  MessageSquare,
  UserPlus,
  Activity
} from "lucide-react";
import { showToast } from "../../components/Toast";
import { 
  Button, 
  Select, 
  Modal, 
  Badge, 
  Card,
  CardContent,
  LoadingSkeleton 
} from "../../components";

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

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "primary" | "success" | "warning" | "danger" | "outline"; icon: any }> = {
  gepland: { label: "Gepland", variant: "default", icon: Calendar },
  bevestigd: { label: "Bevestigd", variant: "primary", icon: CheckCircle2 },
  gaande: { label: "Gaande", variant: "warning", icon: Clock },
  voltooid: { label: "Voltooid", variant: "success", icon: Trophy },
  uitgesteld: { label: "Uitgesteld", variant: "outline", icon: Clock },
  afgelast: { label: "Afgelast", variant: "danger", icon: XSquare },
};

export default function WedstrijdenPage() {
  const { competitieId } = useParams<{ competitieId: string }>();
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[]>([]);
  const [competitie, setCompetitie] = useState<Competitie | null>(null);
  const [rondes, setRondes] = useState<Speelronde[]>([]);
  const [, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      showToast.error("Fout bij laden van gegevens");
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
        showToast.success(`Succesvol ${result.data.geimporteerd} wedstrijden geïmporteerd`);
        loadData();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast.error(error.response?.data?.detail || "Fout bij importeren");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (wedstrijdId: string, newStatus: string) => {
    try {
      await tenantApi.updateWedstrijd(wedstrijdId, { status: newStatus });
      showToast.success("Status bijgewerkt");
      loadData();
      if (showDetail?.id === wedstrijdId) {
        setShowDetail(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast.error(error.response?.data?.detail || "Fout bij bijwerken");
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
        wedstrijden: [] as Wedstrijd[],
      };
    }
    acc[key].wedstrijden.push(w);
    return acc;
  }, {} as Record<string, { ronde: Speelronde | null; wedstrijden: Wedstrijd[] }>);

  const sortedRondeIds = Object.keys(groupedByRonde).sort((a, b) => {
    const rondeA = groupedByRonde[a].ronde;
    const rondeB = groupedByRonde[b].ronde;
    if (!rondeA || !rondeB) return 0;
    return new Date(rondeA.datum).getTime() - new Date(rondeB.datum).getTime();
  });

  if (isLoading) {
    return <LoadingSkeleton rows={10} />;
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Wedstrijden {competitie ? `- ${competitie.naam}` : ""}
          </h1>
          <p className="text-gray-500 font-medium">
            Totaaloverzicht van {wedstrijden.length} geplande en gespeelde wedstrijden.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowImport(true)}
            className="gap-2"
          >
            <Upload size={16} />
            Import KNLTB
          </Button>
          <Button className="gap-2">
            <Plus size={16} />
            Nieuwe Wedstrijd
          </Button>
        </div>
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-4 items-center bg-gray-50/50">
        <Select
          value={filterRonde}
          onChange={(e) => setFilterRonde(e.target.value)}
          className="max-w-xs"
          options={[
            { value: "", label: "Alle speelrondes" },
            ...rondes.map((r) => ({
              value: r.id,
              label: `Ronde ${r.week_nummer} - ${new Date(r.datum).toLocaleDateString("nl-NL")}`,
            })),
          ]}
        />

        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="max-w-xs"
          options={[
            { value: "", label: "Alle statussen" },
            ...Object.entries(STATUS_CONFIG).map(([val, cfg]) => ({
              value: val,
              label: cfg.label,
            })),
          ]}
        />
      </Card>

      <div className="space-y-12">
        {sortedRondeIds.map((rondeId) => {
          const data = groupedByRonde[rondeId];
          return (
            <section key={rondeId} className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                 <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black">
                   {data.ronde?.week_nummer}
                 </div>
                 <h2 className="text-xl font-black text-gray-900">
                    Speelronde {data.ronde?.week_nummer}
                    <span className="ml-3 text-gray-400 font-medium text-sm italic">
                      {data.ronde && new Date(data.ronde.datum).toLocaleDateString("nl-NL", { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                 </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.wedstrijden.map((w) => {
                  const status = STATUS_CONFIG[w.status] || STATUS_CONFIG.gepland;
                  const StatusIcon = status.icon;
                  
                  return (
                    <Card 
                      key={w.id} 
                      onClick={() => setShowDetail(w)}
                      className={`group cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${
                        w.status === "voltooid" ? "bg-gray-50/50" : "bg-white"
                      }`}
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <Badge variant={status.variant} className="gap-1.5 py-1 px-2.5">
                            <StatusIcon size={12} />
                            {status.label}
                          </Badge>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-tighter">
                             {w.baan ? (
                               <><MapPin size={12} className="text-blue-500" /> Baan {w.baan.nummer}</>
                             ) : "Geen baan"}
                          </div>
                        </div>

                        <div className="space-y-2">
                           <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{w.thuisteam?.naam}</span>
                              {w.status === "voltooid" && <span className="font-black text-lg">{w.uitslag_thuisteam}</span>}
                           </div>
                           <div className="h-[1px] bg-gray-100 w-full relative">
                              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[10px] font-black text-gray-300">VS</div>
                           </div>
                           <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{w.uitteam?.naam}</span>
                              {w.status === "voltooid" && <span className="font-black text-lg">{w.uitslag_uitteam}</span>}
                           </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                              <Clock size={10} />
                              {w.speeltijd || "Tijd n.n.b."}
                           </div>
                           <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
        
        {filteredWedstrijden.length === 0 && (
          <Card className="py-20 text-center border-dashed flex flex-col items-center gap-4 bg-gray-50/30">
            <div className="p-4 bg-white rounded-full shadow-sm border">
               <FileSearch size={32} className="text-gray-300" />
            </div>
            <div className="space-y-1">
               <h3 className="font-bold text-gray-900">Geen wedstrijden gevonden</h3>
               <p className="text-sm text-gray-500 max-w-xs mx-auto">
                 Pas je filters aan of importeer een speelschema om resultaten te zien.
               </p>
            </div>
          </Card>
        )}
      </div>

      <Modal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        title="Wedstrijd Details"
        maxWidth="md"
      >
        {showDetail && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl relative overflow-hidden">
                <div className="absolute -right-2 -bottom-2 opacity-10">
                  <Trophy size={60} />
                </div>
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 block">Thuisteam</label>
                <div className="font-black text-lg text-blue-900 leading-tight">{showDetail.thuisteam?.naam}</div>
                {showDetail.thuisteam?.speelklasse && <Badge variant="outline" className="mt-1 text-[10px] py-0 border-blue-200 text-blue-700 bg-white">{showDetail.thuisteam.speelklasse}</Badge>}
              </div>
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl relative overflow-hidden">
                <div className="absolute -right-2 -bottom-2 opacity-10 text-indigo-600">
                  <UserPlus size={60} />
                </div>
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 block">Uitteam</label>
                <div className="font-black text-lg text-indigo-900 leading-tight">{showDetail.uitteam?.naam}</div>
                {showDetail.uitteam?.speelklasse && <Badge variant="outline" className="mt-1 text-[10px] py-0 border-indigo-200 text-indigo-700 bg-white">{showDetail.uitteam.speelklasse}</Badge>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="p-2 bg-white rounded-lg border shadow-sm">
                   <Calendar size={18} className="text-gray-400" />
                </div>
                <div>
                   <div className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Speeldatum</div>
                   <div className="font-bold text-gray-900">
                      {showDetail.ronde?.datum ? new Date(showDetail.ronde.datum).toLocaleDateString("nl-NL", { weekday: 'long', day: 'numeric', month: 'long' }) : "-"}
                   </div>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="p-2 bg-white rounded-lg border shadow-sm">
                   <MapPin size={18} className="text-gray-400" />
                </div>
                <div>
                   <div className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Locatie / Baan</div>
                   <div className="font-bold text-gray-900">
                      {showDetail.baan ? `Baan ${showDetail.baan.nummer} ${showDetail.baan.naam ? `(${showDetail.baan.naam})` : ""}` : "Baan n.n.b."}
                   </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-black text-gray-700 flex items-center gap-2">
                 <Activity size={16} className="text-blue-600" />
                 Wijzig Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(STATUS_CONFIG).map(([val, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={val}
                      onClick={() => handleUpdateStatus(showDetail.id, val)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center ${
                        showDetail.status === val 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                        : 'bg-white border-gray-100 text-gray-600 hover:border-blue-400'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-xs font-bold">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {showDetail.notitie && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-widest">
                   <MessageSquare size={14} /> Notitie
                </div>
                <p className="text-sm text-amber-900 leading-relaxed font-medium italic">
                   "{showDetail.notitie}"
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showImport}
        onClose={() => { setShowImport(false); setImportResult(null); }}
        title="Import KNLTB Speelschema"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowImport(false)}>Annuleren</Button>
            <Button onClick={handleImport} isLoading={isSaving} disabled={!selectedFile}>Importeren</Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3 text-blue-800">
             <Info size={20} className="flex-shrink-0" />
             <div className="text-xs space-y-1 font-medium">
                <p className="font-bold text-sm">KNLTB Import Instructies</p>
                <p>Upload het CSV bestand zoals gedownload uit MijnKNLTB.</p>
                <p>Vereiste kolommen: <code className="bg-white/50 px-1 rounded">datum</code>, <code className="bg-white/50 px-1 rounded">thuisteam</code>, <code className="bg-white/50 px-1 rounded">uitteam</code>.</p>
             </div>
          </div>

          <div className="space-y-2">
            <div 
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/10 transition-all cursor-pointer group"
              onClick={() => document.getElementById('knltb-upload')?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" />
              <p className="text-sm text-gray-600 font-bold">
                {selectedFile ? selectedFile.name : "Klik om te uploaden of sleep .csv bestand"}
              </p>
              <input
                id="knltb-upload"
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    setImportResult(null);
                  }
                }}
                className="hidden"
              />
            </div>
          </div>

          {importResult && (
            <div className={`p-4 rounded-xl border space-y-4 ${importResult.succes ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-lg ${importResult.succes ? "bg-green-500" : "bg-red-500"} text-white font-black`}>
                    {importResult.geimporteerd}
                 </div>
                 <div>
                    <p className={`font-bold text-sm ${importResult.succes ? "text-green-900" : "text-red-900"}`}>
                       {importResult.succes ? "Import voltooid" : "Import met waarschuwingen"}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">{importResult.overgeslagen} rijen overgeslagen</p>
                 </div>
              </div>
              
              {importResult.fouten.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-gray-200/50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Foutlogboek (eerste 3):</p>
                  {importResult.fouten.slice(0, 3).map((e, i) => (
                    <div key={i} className="text-[10px] text-red-700 bg-white/50 p-1 rounded">Rij {e.rij}: {e.fout}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}