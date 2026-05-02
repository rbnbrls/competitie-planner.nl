/*
 * File: frontend/src/pages/tenant/RondeDetail.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRondeDetail } from "../../hooks/useRondeDetail";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { showToast } from "../../components/Toast";
import {
  Button, 
  Badge, 
  Card, 
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  LoadingSkeleton,
  EmptyState,
  Skeleton,
} from "../../components";
import {
  ArrowLeft,
  Globe,
  Wand2,
  Copy,
  ExternalLink,
  ShieldAlert,
  Lock,
  Unlock,
  GripVertical,
  Umbrella,
  Sun,
  MessageSquare,
  Clock,
  Users,
  Layout,
  Activity,
  Trophy,
  Printer,
  History,
  RotateCcw
} from "lucide-react";

interface Team {
  id: string;
  naam: string;
  captain_naam?: string;
  speelklasse?: string;
}

interface Baan {
  id: string;
  nummer: number;
  naam?: string;
  prioriteit_score: number;
  overdekt: boolean;
  verlichting_type: string;
  notitie?: string;
}

interface Toewijzing {
  id: string;
  team_id: string;
  baan_id?: string;
  tijdslot_start?: string | null;
  tijdslot_eind?: string | null;
  notitie?: string;
  team?: Team;
  baan?: Baan;
}

export interface Wedstrijd {
  id: string;
  ronde_id: string;
  thuisteam_id: string;
  uitteam_id: string;
  status: string;
  thuisteam?: Team;
  uitteam?: Team;
}


interface SortableRowProps {
  toewijzing: Toewijzing;
  teams: Team[];
  allBanen: Baan[];
  isReadOnly: boolean;
  onUpdate: (id: string, data: Partial<{ team_id: string; baan_id: string; tijdslot_start: string | null; tijdslot_eind: string | null; notitie: string }>) => void;
}

function SortableToewijzingRow({
  toewijzing,
  teams,
  allBanen,
  isReadOnly,
  onUpdate,
}: SortableRowProps) {
  const [localStart, setLocalStart] = useState(toewijzing.tijdslot_start?.slice(0, 5) ?? "");
  const [localEnd, setLocalEnd] = useState(toewijzing.tijdslot_eind?.slice(0, 5) ?? "");
  const [localNotitie, setLocalNotitie] = useState(toewijzing.notitie ?? "");

  useEffect(() => {
    setLocalStart(toewijzing.tijdslot_start?.slice(0, 5) || "");
    setLocalEnd(toewijzing.tijdslot_eind?.slice(0, 5) || "");
    setLocalNotitie(toewijzing.notitie || "");
  }, [toewijzing.tijdslot_start, toewijzing.tijdslot_eind, toewijzing.notitie]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const formattedStart = localStart ? `${localStart}:00` : null;
      if (formattedStart !== (toewijzing.tijdslot_start || null)) {
         onUpdate(toewijzing.id, { tijdslot_start: formattedStart });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [localStart, onUpdate, toewijzing.id, toewijzing.tijdslot_start]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const formattedEnd = localEnd ? `${localEnd}:00` : null;
      if (formattedEnd !== (toewijzing.tijdslot_eind || null)) {
         onUpdate(toewijzing.id, { tijdslot_eind: formattedEnd });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [localEnd, onUpdate, toewijzing.id, toewijzing.tijdslot_eind]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localNotitie !== (toewijzing.notitie || "")) {
         onUpdate(toewijzing.id, { notitie: localNotitie });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [localNotitie, onUpdate, toewijzing.id, toewijzing.notitie]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: toewijzing.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const team = teams.find((t) => t.id === toewijzing.team_id);
  const baan = allBanen.find((b) => b.id === toewijzing.baan_id);

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? "bg-blue-50 shadow-inner" : ""}
    >
      <TableCell className="w-10">
        {!isReadOnly && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-blue-600 transition-colors">
            <GripVertical size={18} />
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 font-black text-lg text-gray-900">
            {baan?.nummer}
            <div className="flex gap-1">
              {baan?.overdekt && (
                <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[9px] uppercase"><Umbrella size={8} className="mr-1" /> Binnen</Badge>
              )}
              {baan?.verlichting_type !== "geen" && (
                <Badge variant="outline" className="px-1.5 py-0 h-4 text-[9px] uppercase border-yellow-200 text-yellow-700 bg-yellow-50"><Sun size={8} className="mr-1" /> {baan?.verlichting_type}</Badge>
              )}
            </div>
          </div>
          {baan?.naam && <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{baan.naam}</span>}
        </div>
      </TableCell>
      <TableCell className="min-w-[200px]">
        {isReadOnly ? (
          <div className="font-bold text-gray-900">{team?.naam || "-"}</div>
        ) : (
          <select
            value={toewijzing.team_id}
            onChange={(e) => onUpdate(toewijzing.id, { team_id: e.target.value })}
            className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm font-semibold focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm"
          >
            <option value="">Geen team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.naam}
              </option>
            ))}
          </select>
        )}
        {team?.captain_naam && <div className="text-[10px] text-gray-400 mt-1 pl-1">👤 {team.captain_naam}</div>}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={localStart}
            onChange={(e) => setLocalStart(e.target.value)}
            disabled={isReadOnly}
            className="h-10 w-24 px-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-center focus:ring-2 focus:ring-blue-600 outline-none disabled:bg-transparent disabled:border-transparent transition-all"
          />
          <span className="text-gray-300">→</span>
          <input
            type="time"
            value={localEnd}
            onChange={(e) => setLocalEnd(e.target.value)}
            disabled={isReadOnly}
            className="h-10 w-24 px-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-center focus:ring-2 focus:ring-blue-600 outline-none disabled:bg-transparent disabled:border-transparent transition-all"
          />
        </div>
      </TableCell>
      <TableCell className="min-w-[150px]">
        <div className="relative group/notitie">
           <MessageSquare size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/notitie:text-blue-500 transition-colors" />
           <input
            type="text"
            value={localNotitie}
            onChange={(e) => setLocalNotitie(e.target.value)}
            disabled={isReadOnly}
            placeholder="Opmerking..."
            maxLength={200}
            className="h-10 w-full pl-9 pr-3 rounded-lg border border-gray-100 bg-gray-50/50 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none disabled:bg-transparent disabled:border-transparent transition-all"
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function RondeDetailPage() {
  const { rondeId, competitieId } = useParams<{ rondeId: string; competitieId: string }>();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    ronde,
    teams,
    banen,
    wedstrijden,
    snapshots,
    isLoadingRonde,
    isLoadingTeams,
    isLoadingBanen,
    isLoadingWedstrijden,
    isLoadingSnapshots,
    updateToewijzing,
    swapToewijzingen,
    generateIndeling,
    publishRonde,
    depublishRonde,
    herstellSnapshot,
  } = useRondeDetail(rondeId, competitieId);

  const isInitialLoad = isLoadingRonde;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleGenerate = async () => {
    if (ronde?.toewijzingen?.length && !window.confirm("Dit overschrijft de huidige concept indeling. Doorgaan?")) {
      return;
    }
    await generateIndeling.mutateAsync();
  };

  const handlePublish = async () => {
    const res = await publishRonde.mutateAsync();
    if (res?.data?.public_url) {
      setPublicUrl(res.data.public_url);
      showToast.success("Ronde is nu live!");
    }
  };

  const handleDepublish = async () => {
    if (!window.confirm("Weet je zeker dat je de publicatie wilt intrekken? De indeling is dan niet meer zichtbaar op de display.")) {
      return;
    }
    await depublishRonde.mutateAsync();
    setPublicUrl(null);
    showToast.success("Publicatie ingetrokken");
  };

  const handleCopyUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(window.location.origin + publicUrl);
      setCopied(true);
      showToast.success("Link gekopieerd");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast.error("Kopiëren mislukt");
    }
  };

  const handleUpdateToewijzing = async (id: string, data: Partial<{ team_id: string; baan_id: string; tijdslot_start: string | null; tijdslot_eind: string | null; notitie: string }>) => {
    await updateToewijzing({ id, data });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id || !ronde) return;

    const activeToewijzing = ronde.toewijzingen.find((t: Toewijzing) => t.id === active.id);
    const overToewijzing = ronde.toewijzingen.find((t: Toewijzing) => t.id === over.id);

    if (!activeToewijzing || !overToewijzing) return;

    await swapToewijzingen({
      activeId: activeToewijzing.id,
      activeTeamId: activeToewijzing.team_id,
      overId: overToewijzing.id,
      overTeamId: overToewijzing.team_id
    });
  };

  const isReadOnly = ronde?.status === "gepubliceerd";
  const toewijzingIds = ronde?.toewijzingen?.map((t: Toewijzing) => t.id) || [];

  const toewijzingenPerBaan = (ronde?.toewijzingen || []).reduce(
    (acc: Record<string, Toewijzing[]>, t: Toewijzing) => {
      const baanId = t.baan_id || 'unknown';
      if (!acc[baanId]) acc[baanId] = [];
      acc[baanId].push(t);
      return acc;
    },
    {}
  );

  const parseTimeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const thuisteamIds = new Set(wedstrijden.map((w: Wedstrijd) => w.thuisteam_id));
  const thuisteams = teams.filter((t: Team) => thuisteamIds.has(t.id));
  const teamsForDropdown = thuisteamIds.size > 0 ? thuisteams : teams;

  const assignedTeamIds = new Set(ronde?.toewijzingen?.map((t: Toewijzing) => t.team_id) || []);
  const unassignedTeams = teamsForDropdown.filter((t: Team) => !assignedTeamIds.has(t.id));

  if (isInitialLoad) {
    return <LoadingSkeleton rows={15} />;
  }

  if (!ronde) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ShieldAlert size={48} className="text-red-500" />
        <h2 className="text-xl font-bold">Ronde niet gevonden</h2>
        <Button onClick={() => navigate(-1)}>Ga terug</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-blue-600 -ml-2 gap-2 font-bold" 
            onClick={() => navigate(`/rondes/${competitieId}`)}
          >
            <ArrowLeft size={16} /> Terug naar overzicht
          </Button>
          <div className="flex items-center gap-4">
             <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center shadow-lg shadow-blue-200">
               <span className="text-[10px] font-black uppercase leading-none opacity-80">Week</span>
               <span className="text-2xl font-black">{ronde.week_nummer}</span>
             </div>
             <div>
                <h1 className="text-3xl font-black tracking-tight text-gray-900 border-none p-0">
                  {new Date(ronde.datum).toLocaleDateString("nl-NL", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={ronde.status === "gepubliceerd" ? "success" : "default"} className="gap-1.5">
                    {ronde.status === "gepubliceerd" ? <Lock size={12} /> : <Unlock size={12} />}
                    {ronde.status === "gepubliceerd" ? "Gepubliceerd" : "Concept Indeling"}
                  </Badge>
                  <span className="text-gray-300">|</span>
                  <div className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Users size={14} className="text-gray-300" /> {wedstrijden.length} Wedstrijden
                  </div>
                </div>
             </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isReadOnly ? (
            <>
              <Button
                variant="secondary"
                onClick={handleGenerate}
                isLoading={generateIndeling.isPending}
                className="gap-2 h-12 shadow-sm"
              >
                <Wand2 size={18} />
                Genereer Indeling
              </Button>
              {ronde.toewijzingen?.length > 0 && (
                <Button
                  onClick={handlePublish}
                  isLoading={publishRonde.isPending}
                  className="gap-2 h-12 shadow-md shadow-blue-100"
                >
                  <Globe size={18} />
                  Publiceren
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate(`/ronde/${rondeId}/${competitieId}/print`)}
                className="gap-2 h-12"
              >
                <Printer size={18} />
                Afdrukoverszicht
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="danger"
                onClick={handleDepublish}
                isLoading={depublishRonde.isPending}
                className="gap-2 h-12"
              >
                <Lock size={18} />
                Publicatie Intrekken
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`${window.location.origin}/public/ronde/${ronde.public_token}`, '_blank')}
                className="gap-2 h-12"
              >
                <ExternalLink size={18} />
                Live Display
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/ronde/${rondeId}/${competitieId}/print`)}
                className="gap-2 h-12 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Printer size={18} />
                Afdrukoverszicht
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Shareable Link Bar */}
      {ronde.status === "gepubliceerd" && (
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 border-none shadow-xl shadow-blue-100 p-1">
          <div className="bg-white/10 backdrop-blur-sm rounded-[10px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-white">
               <div className="p-2 bg-white/20 rounded-lg">
                 <Copy size={20} />
               </div>
               <div>
                  <p className="text-xs font-black uppercase tracking-wider opacity-70">Deel deze indeling</p>
                  <p className="font-medium text-sm">Toon de indeling op schermen in de club of stuur de link naar captains.</p>
               </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
               <div className="flex-1 sm:w-64 bg-black/20 text-white/90 px-3 py-2 rounded-lg text-xs font-mono truncate border border-white/10">
                 {window.location.origin}/public/ronde/{ronde.public_token}
               </div>
               <Button variant="secondary" size="sm" onClick={handleCopyUrl} className="h-9">
                 {copied ? "Gekopieerd!" : "Kopieer Link"}
               </Button>
            </div>
          </div>
        </Card>
      )}

<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Indeling Table */}
          <section className="space-y-4">
             <div className="flex items-center justify-between px-1">
               <h3 className="font-black text-gray-900 flex items-center gap-2">
                 <Layout size={18} className="text-blue-600" />
                 Baanbezetting
               </h3>
               {!isLoadingTeams && unassignedTeams.length > 0 && (
                 <Badge variant="warning" className="animate-pulse">
                   {unassignedTeams.length} Teams over
                 </Badge>
               )}
             </div>

             {isLoadingTeams || isLoadingBanen ? (
               <Card className="overflow-hidden border-gray-100">
                 <Table>
                   <TableHeader className="bg-gray-50/50">
                     <TableRow>
                       <TableHead className="w-10"></TableHead>
                       <TableHead>Baan</TableHead>
                       <TableHead>Team (Thuis)</TableHead>
                       <TableHead>Tijdslot</TableHead>
                       <TableHead>Notitie</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {[...Array(5)].map((_, i) => (
                       <TableRow key={i}>
                         <TableCell className="w-10"><Skeleton className="h-4 w-4" /></TableCell>
                         <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                         <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                         <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                         <TableCell><Skeleton className="h-8 w-28" /></TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </Card>
             ) : (
               <Card className="overflow-hidden border-gray-100">
                 <Table>
                   <TableHeader className="bg-gray-50/50">
                     <TableRow>
                       <TableHead className="w-10"></TableHead>
                       <TableHead>Baan</TableHead>
                       <TableHead>Team (Thuis)</TableHead>
                       <TableHead>Tijdslot</TableHead>
                       <TableHead>Notitie</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                    {!isReadOnly ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext items={toewijzingIds} strategy={verticalListSortingStrategy}>
                          {(ronde.toewijzingen || []).map((t: Toewijzing) => (
                            <SortableToewijzingRow
                              key={t.id}
                              toewijzing={t}
                              teams={teamsForDropdown}
                              allBanen={banen}
                              isReadOnly={isReadOnly}
                              onUpdate={handleUpdateToewijzing}
                            />
                          ))}
                        </SortableContext>
                        <DragOverlay>
                          {activeId ? (
                            <div className="bg-white p-4 rounded-xl border-2 border-blue-600 shadow-2xl flex items-center gap-4 opacity-90 scale-105 transition-transform">
                              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">
                                 {ronde.toewijzingen.find((t: Toewijzing) => t.id === activeId)?.baan?.nummer}
                              </div>
                              <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Wissel positie</p>
                                <p className="font-bold text-gray-900">Sleep om banen te wisselen</p>
                              </div>
                            </div>
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                    ) : (
                       ronde.toewijzingen.map((t: Toewijzing) => (
                         <TableRow key={t.id}>
                            <TableCell></TableCell>
                            <TableCell>
                               <div className="flex items-center gap-2 font-bold text-gray-900">
                                 Baan {t.baan?.nummer}
                                 {t.baan?.overdekt && <Badge variant="secondary" className="scale-75">Binnen</Badge>}
                               </div>
                            </TableCell>
                            <TableCell className="font-bold text-blue-600">{t.team?.naam || "-"}</TableCell>
                            <TableCell className="font-mono text-xs">
                               <Badge variant="outline" className="gap-1.5 font-bold">
                                 <Clock size={10} />
                                 {t.tijdslot_start?.slice(0, 5)} - {t.tijdslot_eind?.slice(0, 5)}
                               </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-gray-500 italic font-medium">
                               {t.notitie || "-"}
                            </TableCell>
                         </TableRow>
                       ))
                    )}
                     {ronde.toewijzingen?.length === 0 && (
                       <TableRow>
                         <EmptyState
                           icon={Wand2}
                           title="Nog geen indeling gegenereerd"
                           description="Genereer automatisch een indeling voor deze speelronde."
                           actionLabel="Nu genereren"
                           variant="table"
                           colSpan={5}
                           onAction={handleGenerate}
                         />
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </Card>
             )}
          </section>
        </div>

        <div className="space-y-8">
           {/* Timeline Visualization */}
           <section className="space-y-4">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Activity size={18} className="text-indigo-600" />
                Tijdlijn
              </h3>
              {isLoadingBanen ? (
                <Card className="p-4 bg-gray-50/50">
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between items-center px-1">
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-7 w-full rounded-lg" />
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card className="p-4 bg-gray-50/50">
                  <div className="space-y-4">
                    {banen
                      .filter((b: Baan) => toewijzingenPerBaan[b.id]?.length > 0)
                      .sort((a: Baan, b: Baan) => a.nummer - b.nummer)
                      .map((baan: Baan) => {
                        const baanToewijzingen = toewijzingenPerBaan[baan.id] || [];
                        return (
                          <div key={baan.id} className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Baan {baan.nummer}</span>
                              {baan.overdekt && <Umbrella size={10} className="text-blue-400" />}
                            </div>
                            <div className="relative h-7 bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden p-0.5">
                              {baanToewijzingen.map((t: Toewijzing, idx: number) => {
                                const startMinutes = t.tijdslot_start ? parseTimeToMinutes(t.tijdslot_start) : 19 * 60;
                                const endMinutes = t.tijdslot_eind ? parseTimeToMinutes(t.tijdslot_eind) : 21 * 60;
                                const team = teams.find((team: Team) => team.id === t.team_id);
                                
                                const width = Math.max(((endMinutes - startMinutes) / 300) * 100, 10);
                                const left = ((startMinutes - 18 * 60) / 300) * 100;
                                
                                return (
                                  <div
                                    key={t.id}
                                    className={`absolute h-5 top-0.5 rounded-md text-[9px] font-black text-white px-1.5 flex items-center truncate ${idx % 2 === 0 ? 'bg-blue-500 shadow-sm shadow-blue-100' : 'bg-indigo-500 shadow-sm shadow-indigo-100'}`}
                                    style={{
                                      left: `${Math.max(left, 0.5)}%`,
                                      width: `${Math.min(width, 100 - left - 1)}%`,
                                    }}
                                    title={`${team?.naam || "-"}: ${t.tijdslot_start?.slice(0, 5) || "19:00"} - ${t.tijdslot_eind?.slice(0, 5) || "21:00"}`}
                                  >
                                    {team?.naam || "-"}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-between text-[9px] font-black text-gray-300 uppercase tracking-tighter pt-2 border-t px-1">
                        <span>18:00</span>
                        <span>19:00</span>
                        <span>20:00</span>
                        <span>21:00</span>
                        <span>22:00</span>
                        <span>23:00</span>
                      </div>
                  </div>
                </Card>
              )}
           </section>

           {/* Wedstrijd Details sidebar */}
           <section className="space-y-4 text-gray-900">
             <h3 className="text-lg font-black flex items-center gap-2">
               <Trophy size={18} className="text-amber-500" />
               Ingeroosterde Teams
             </h3>
             {isLoadingWedstrijden ? (
               <div className="space-y-2">
                 {[...Array(3)].map((_, i) => (
                   <Card key={i} className="border-gray-50">
                     <CardContent className="p-3">
                       <div className="flex items-center gap-3">
                         <div className="flex-1 space-y-2">
                           <Skeleton className="h-4 w-3/4" />
                           <Skeleton className="h-3 w-1/2" />
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                 ))}
               </div>
             ) : (
               wedstrijden.length === 0 ? (
                 <p className="text-sm text-gray-500">Geen wedstrijden gevonden</p>
               ) : (
                 <div className="space-y-2">
                   {wedstrijden.map((w: Wedstrijd) => (
                     <Card key={w.id} className="border-gray-50 hover:border-blue-100 transition-colors">
                       <CardContent className="p-3">
                         <div className="flex items-center justify-between text-[10px] mb-2 font-black uppercase tracking-widest text-gray-400">
                            <span>Wedstrijd</span>
                            <Badge variant="outline" className="h-4 p-1 text-[8px]">KNLTB</Badge>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="flex-1 space-y-1">
                               <div className="text-sm font-bold truncate text-gray-700">{w.thuisteam?.naam}</div>
                               <div className="text-[10px] text-gray-300 font-bold flex items-center gap-1">VS <span className="text-gray-400 font-medium">{w.uitteam?.naam}</span></div>
                            </div>
                            <Badge variant="success" className="h-6">THUIS</Badge>
                         </div>
                       </CardContent>
                     </Card>
                   ))}
                 </div>
               )
             )}
           </section>

           {/* Unassigned Teams */}
           {!isLoadingTeams && unassignedTeams.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-lg font-black text-red-600 flex items-center gap-2">
                  <ShieldAlert size={18} />
                  Niet Ingepland
                </h3>
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl space-y-3">
                  <p className="text-xs font-medium text-red-800">De volgende teams hebben een thuiswedstrijd maar zijn nog niet toegewezen aan een baan.</p>
                  <div className="flex flex-wrap gap-2">
                     {unassignedTeams.map((t: Team) => (
                       <Badge key={t.id} variant="danger" className="py-1 px-3 border-none bg-white text-red-600 font-black shadow-sm">
                         {t.naam}
                       </Badge>
                     ))}
                  </div>
                  <Button variant="secondary" className="w-full h-10 border-red-200 text-red-700 font-bold bg-white" onClick={handleGenerate}>
                    Slim Proberen te Plannen
                  </Button>
                </div>
              </section>
           )}

           {/* Version History */}
           {!isReadOnly && (!isLoadingSnapshots && snapshots.length > 0) && (
             <section className="space-y-4">
               <h3 className="text-lg font-black text-gray-700 flex items-center gap-2">
                 <History size={18} className="text-gray-400" />
                 Versiegeschiedenis
               </h3>
               <div className="space-y-2">
                 {snapshots.map((s, idx) => (
                   <div
                     key={s.id}
                     className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-blue-100 transition-colors"
                   >
                     <div className="space-y-0.5">
                       <div className="text-xs font-black text-gray-500 uppercase tracking-widest">
                         {idx === 0 ? "Meest recent" : `Versie ${snapshots.length - idx}`}
                       </div>
                       <div className="text-[10px] text-gray-400">
                         {new Date(s.created_at).toLocaleString("nl-NL", {
                           day: "numeric",
                           month: "short",
                           hour: "2-digit",
                           minute: "2-digit",
                         })}
                         {" · "}
                         <span className="text-gray-500 font-semibold">{s.count} toewijzingen</span>
                       </div>
                     </div>
                     <Button
                       variant="outline"
                       size="sm"
                       className="h-8 gap-1.5 text-xs border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700"
                       isLoading={herstellSnapshot.isPending}
                       onClick={() => {
                         if (window.confirm("Huidige indeling wordt vervangen door deze versie. Doorgaan?")) {
                           herstellSnapshot.mutateAsync(s.id);
                         }
                       }}
                     >
                       <RotateCcw size={12} />
                       Herstel
                     </Button>
                   </div>
                 ))}
               </div>
             </section>
           )}
         </div>
       </div>
     </div>
   );
 }