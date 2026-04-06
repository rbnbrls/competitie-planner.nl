import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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
import { tenantApi } from "../../lib/api";
import { showToast } from "../../components/Toast";

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
  baan_id: string;
  tijdslot_start: string;
  tijdslot_eind?: string;
  notitie?: string;
  team?: Team;
  baan?: Baan;
}

interface Wedstrijd {
  id: string;
  ronde_id: string;
  thuisteam_id: string;
  uitteam_id: string;
  status: string;
  thuisteam?: Team;
  uitteam?: Team;
}

interface RondeDetail {
  id: string;
  competitie_id: string;
  club_id: string;
  datum: string;
  week_nummer: number;
  is_inhaalronde: boolean;
  status: string;
  toewijzingen: Toewijzing[];
}

interface SortableRowProps {
  toewijzing: Toewijzing;
  teams: Team[];
  allBanen: Baan[];
  isReadOnly: boolean;
  onUpdate: (id: string, data: any) => void;
  onTimeSlotChange: (id: string, field: "start" | "end", value: string) => void;
  onNotitieChange: (id: string, value: string) => void;
}

function SortableToewijzingRow({
  toewijzing,
  teams,
  allBanen,
  isReadOnly,
  onUpdate,
  onTimeSlotChange,
  onNotitieChange,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: toewijzing.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const team = teams.find((t) => t.id === toewijzing.team_id);
  const baan = allBanen.find((b) => b.id === toewijzing.baan_id);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b ${isDragging ? "bg-blue-50" : ""}`}
    >
      <td className="px-4 py-3" {...attributes} {...listeners}>
        {isReadOnly ? null : (
          <span className="cursor-grab text-gray-400 hover:text-gray-600">⋮⋮</span>
        )}
      </td>
      <td className="px-4 py-3 font-medium">
        <div className="flex items-center gap-2">
          <span className="text-lg">{baan?.nummer}</span>
          {baan?.overdekt && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
              Overdekt
            </span>
          )}
          {baan?.verlichting_type !== "geen" && (
            <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded">
              {baan?.verlichting_type}
            </span>
          )}
        </div>
        {baan?.naam && <div className="text-sm text-gray-500">{baan.naam}</div>}
      </td>
      <td className="px-4 py-3">
        {isReadOnly ? (
          <span>{team?.naam || "-"}</span>
        ) : (
          <select
            value={toewijzing.team_id}
            onChange={(e) => onUpdate(toewijzing.id, { team_id: e.target.value })}
            className="border rounded px-2 py-2 min-h-[44px] w-full"
          >
            <option value="">Geen team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.naam}
              </option>
            ))}
          </select>
        )}
        {team && (
          <div className="text-sm text-gray-500">
            {team.captain_naam && `${team.captain_naam}`}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <input
            type="time"
            value={toewijzing.tijdslot_start?.slice(0, 5) || ""}
            onChange={(e) => onTimeSlotChange(toewijzing.id, "start", e.target.value)}
            disabled={isReadOnly}
            className="border rounded px-2 py-2 min-h-[44px] w-24"
          />
          <span className="self-center">-</span>
          <input
            type="time"
            value={toewijzing.tijdslot_eind?.slice(0, 5) || ""}
            onChange={(e) => onTimeSlotChange(toewijzing.id, "end", e.target.value)}
            disabled={isReadOnly}
            className="border rounded px-2 py-2 min-h-[44px] w-24"
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={toewijzing.notitie || ""}
          onChange={(e) => onNotitieChange(toewijzing.id, e.target.value)}
          disabled={isReadOnly}
          placeholder="Notitie..."
          maxLength={200}
          className="border rounded px-2 py-2 min-h-[44px] w-full"
        />
      </td>
    </tr>
  );
}

export default function RondeDetailPage() {
  const { rondeId, competitieId } = useParams<{ rondeId: string; competitieId: string }>();
  const [ronde, setRonde] = useState<RondeDetail | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [banen, setBanen] = useState<Baan[]>([]);
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDepublishing, setIsDepublishing] = useState(false);
  const [isDepublishing, setIsDepublishing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    if (rondeId) {
      loadData();
    }
  }, [rondeId]);

  const loadData = () => {
    if (!rondeId || !competitieId) return;

    Promise.all([
      tenantApi.getRondeDetail(rondeId),
      tenantApi.getTeamsForPlanning(competitieId),
      tenantApi.getBanenForPlanning(),
      tenantApi.getWedstrijden(rondeId),
    ])
      .then(([rondeRes, teamsRes, banenRes, wedstrijdenRes]) => {
        setRonde(rondeRes.data);
        setTeams(teamsRes.data);
        setBanen(banenRes.data);
        setWedstrijden(wedstrijdenRes.data.wedstrijden || []);
      })
      .finally(() => setIsLoading(false));
  };

  const handleGenerate = async () => {
    if (!rondeId) return;

    if (ronde?.toewijzingen?.length && !window.confirm("Dit overschrijft de huidige concept indeling. Doorgaan?")) {
      return;
    }

    setIsGenerating(true);
    try {
      const res = await tenantApi.generateIndeling(rondeId);
      setRonde((prev) =>
        prev
          ? {
              ...prev,
              toewijzingen: res.data.toewijzingen.map((t: any) => ({
                ...t,
                team: teams.find((team) => team.id === t.team_id),
                baan: banen.find((baan) => baan.id === t.baan_id),
              })),
            }
          : null
      );
      showToast.success("Indeling gegenereerd");
    } catch {
      showToast.error("Fout bij genereren");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!rondeId) return;

    setIsPublishing(true);
    try {
      const res = await tenantApi.publishRonde(rondeId);
      setRonde((prev) => (prev ? { ...prev, status: "gepubliceerd" } : null));
      if (res.data.public_url) {
        setPublicUrl(res.data.public_url);
      }
      showToast.success("Ronde gepubliceerd");
    } catch {
      showToast.error("Fout bij publiceren");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDepublish = async () => {
    if (!rondeId) return;

    if (!window.confirm("Weet je zeker dat je de publicatie wilt intrekken? De indeling is dan niet meer zichtbaar op de display.")) {
      return;
    }

    setIsDepublishing(true);
    try {
      await tenantApi.depublishRonde(rondeId);
      setRonde((prev) => (prev ? { ...prev, status: "concept" } : null));
      setPublicUrl(null);
      showToast.success("Ronde gedepubliceerd");
    } catch {
      showToast.error("Fout bij depubliceren");
    } finally {
      setIsDepublishing(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(window.location.origin + publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast.error("Kopiëren mislukt");
    }
  };

  const handleUpdateToewijzing = async (id: string, data: any) => {
    try {
      await tenantApi.updateToewijzing(id, data);
      loadData();
    } catch {
      showToast.error("Fout bij bijwerken");
    }
  };

  const handleTimeSlotChange = async (id: string, field: "start" | "end", value: string) => {
    const formattedValue = value ? `${value}:00` : null;
    await handleUpdateToewijzing(id, {
      [field === "start" ? "tijdslot_start" : "tijdslot_eind"]: formattedValue,
    });
  };

  const handleNotitieChange = async (id: string, value: string) => {
    await handleUpdateToewijzing(id, { notitie: value });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id || !ronde) return;

    const activeToewijzing = ronde.toewijzingen.find((t) => t.id === active.id);
    const overToewijzing = ronde.toewijzingen.find((t) => t.id === over.id);

    if (!activeToewijzing || !overToewijzing) return;

    const activeTeamId = activeToewijzing.team_id;
    const overTeamId = overToewijzing.team_id;

    try {
      await Promise.all([
        tenantApi.updateToewijzing(activeToewijzing.id, { team_id: overTeamId }),
        tenantApi.updateToewijzing(overToewijzing.id, { team_id: activeTeamId }),
      ]);
      loadData();
    } catch {
      showToast.error("Fout bij wisselen");
    }
  };

  const isReadOnly = ronde?.status === "gepubliceerd";
  const toewijzingIds = ronde?.toewijzingen?.map((t) => t.id) || [];

  const toewijzingenPerBaan = (ronde?.toewijzingen || []).reduce(
    (acc: Record<string, Toewijzing[]>, t) => {
      if (!acc[t.baan_id]) {
        acc[t.baan_id] = [];
      }
      acc[t.baan_id].push(t);
      return acc;
    },
    {}
  );

  const parseTimeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const thuisteamIds = new Set(wedstrijden.map((w) => w.thuisteam_id));
  const thuisteams = teams.filter((t) => thuisteamIds.has(t.id));
  const teamsForDropdown = thuisteamIds.size > 0 ? thuisteams : teams;

  const assignedTeamIds = new Set(ronde?.toewijzingen?.map((t) => t.team_id) || []);
  const unassignedTeams = teamsForDropdown.filter((t) => !assignedTeamIds.has(t.id));

  if (isLoading) {
    return <div className="p-4">Laden...</div>;
  }

  if (!ronde) {
    return <div className="p-4">Ronde niet gevonden</div>;
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            to={`/rondes/${competitieId}`}
            className="text-blue-600 hover:underline mb-2 inline-block"
          >
            ← Terug naar speelrondes
          </Link>
          <h1 className="text-2xl font-bold">
            Ronde {ronde.week_nummer} - {new Date(ronde.datum).toLocaleDateString("nl-NL")}
          </h1>
        </div>
        <div className="flex gap-2">
          {ronde.status === "gepubliceerd" ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded flex items-center gap-2">
              Gepubliceerd ✓
            </span>
          ) : (
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded">Concept</span>
          )}
        </div>
      </div>

      {publicUrl && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded flex items-center gap-2">
          <span className="text-sm text-blue-800">Publieke URL:</span>
          <code className="text-sm text-blue-600 bg-white px-2 py-1 rounded">{window.location.origin}{publicUrl}</code>
          <button
            onClick={handleCopyUrl}
            className="px-3 py-2 min-h-[44px] flex items-center justify-center bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            {copied ? "Gekopieerd!" : "Kopieer"}
          </button>
          <a
            href={window.location.origin + publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 min-h-[44px] flex items-center justify-center bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            Open display
          </a>
        </div>
      )}

      {!isReadOnly && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating ? "Genereren..." : "Genereer indeling"}
          </button>
          {ronde.toewijzingen?.length > 0 && (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-4 py-2 min-h-[44px] bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isPublishing ? "Publiceren..." : "Publiceer indeling"}
            </button>
          )}
        </div>
      )}

      {isReadOnly && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={handleDepublish}
            disabled={isDepublishing}
            className="px-4 py-2 min-h-[44px] bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {isDepublishing ? "Depubliceren..." : "Depubliceren"}
          </button>
        </div>
      )}

      {wedstrijden.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Wedstrijden</h2>
          <div className="grid gap-2">
            {wedstrijden.map((w) => (
              <div key={w.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                  Thuis
                </span>
                <span className="font-medium">{w.thuisteam?.naam || "-"}</span>
                <span className="text-gray-400">vs</span>
                <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                  Uit
                </span>
                <span className="text-gray-600">{w.uitteam?.naam || "-"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ronde.toewijzingen && ronde.toewijzingen.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Tijdlijn per baan</h2>
          <div className="space-y-4">
            {banen
              .filter((b) => toewijzingenPerBaan[b.id]?.length > 0)
              .map((baan) => {
                const baanToewijzingen = toewijzingenPerBaan[baan.id] || [];
                return (
                  <div key={baan.id} className="border rounded-lg p-3">
                    <div className="font-medium mb-2 flex items-center gap-2">
                      <span className="text-lg">Baan {baan.nummer}</span>
                      {baan.naam && <span className="text-gray-500">({baan.naam})</span>}
                      {baan.overdekt && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                          Overdekt
                        </span>
                      )}
                    </div>
                    <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
                      {baanToewijzingen.map((t, idx) => {
                        const startMinutes = t.tijdslot_start ? parseTimeToMinutes(t.tijdslot_start) : 19 * 60;
                        const endMinutes = t.tijdslot_eind ? parseTimeToMinutes(t.tijdslot_eind) : 21 * 60;
                        const team = teams.find((team) => team.id === t.team_id);
                        const width = Math.max(((endMinutes - startMinutes) / 180) * 100, 15);
                        const left = ((startMinutes - 18 * 60) / 180) * 100;
                        return (
                          <div
                            key={t.id}
                            className="absolute h-6 top-1 rounded text-xs text-white truncate px-1 flex items-center overflow-hidden"
                            style={{
                              left: `${Math.max(left, 0)}%`,
                              width: `${Math.min(width, 100 - left)}%`,
                              backgroundColor: idx % 2 === 0 ? "#3B82F6" : "#10B981",
                            }}
                            title={`${team?.naam || "-"}: ${t.tijdslot_start?.slice(0, 5) || "19:00"} - ${t.tijdslot_eind?.slice(0, 5) || "21:00"}`}
                          >
                            {team?.naam || "-"}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>18:00</span>
                      <span>19:00</span>
                      <span>20:00</span>
                      <span>21:00</span>
                      <span>22:00</span>
                      <span>23:00</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="hidden md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Baan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tijd
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Notitie
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isReadOnly ? (
                Object.entries(
                  (ronde.toewijzingen || []).reduce(
                    (acc: Record<string, Toewijzing[]>, t) => {
                      const key = `${t.baan_id}-${t.tijdslot_start || "default"}`;
                      if (!acc[key]) {
                        acc[key] = [];
                      }
                      acc[key].push(t);
                      return acc;
                    },
                    {}
                  )
                ).map(([key, toewijzingen]) => {
                  const first = toewijzingen[0];
                  const baan = banen.find((b) => b.id === first.baan_id);
                  const startTime = first.tijdslot_start?.slice(0, 5) || "19:00";
                  const endTime = first.tijdslot_eind?.slice(0, 5) || "";
                  return (
                    <tr key={key} className="border-b">
                      <td className="px-4 py-3">
                        <span className="text-lg">{baan?.nummer}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {baan?.naam && <span>{baan.naam}</span>}
                          {baan?.overdekt && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                              Overdekt
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {toewijzingen.map((t) => {
                            const team = teams.find((team) => team.id === t.team_id);
                            return (
                              <div key={t.id} className="flex items-center gap-2">
                                <span className="font-medium">{team?.naam || "-"}</span>
                                {t.notitie && (
                                  <span className="text-xs text-gray-500">({t.notitie})</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {startTime}
                        {endTime && ` - ${endTime}`}
                      </td>
                      <td className="px-4 py-3">
                        {toewijzingen.length > 1 ? "Meerdere teams" : toewijzingen[0].notitie}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={toewijzingIds} strategy={verticalListSortingStrategy}>
                    {(ronde.toewijzingen || []).map((t) => (
                      <SortableToewijzingRow
                        key={t.id}
                        toewijzing={t}
                        teams={teamsForDropdown}
                        allBanen={banen}
                        isReadOnly={isReadOnly}
                        onUpdate={handleUpdateToewijzing}
                        onTimeSlotChange={handleTimeSlotChange}
                        onNotitieChange={handleNotitieChange}
                      />
                    ))}
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <div className="bg-blue-100 p-3 rounded border-2 border-blue-400">
                        Team wisselen
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-200">
          {isReadOnly ? (
            Object.entries(
              (ronde.toewijzingen || []).reduce(
                (acc: Record<string, Toewijzing[]>, t) => {
                  const key = `${t.baan_id}-${t.tijdslot_start || "default"}`;
                  if (!acc[key]) {
                    acc[key] = [];
                  }
                  acc[key].push(t);
                  return acc;
                },
                {}
              )
            ).map(([key, toewijzingen]) => {
              const first = toewijzingen[0];
              const baan = banen.find((b) => b.id === first.baan_id);
              const startTime = first.tijdslot_start?.slice(0, 5) || "19:00";
              const endTime = first.tijdslot_eind?.slice(0, 5) || "";
              return (
                <div key={key} className="p-4 bg-white flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-lg">Baan {baan?.nummer}</div>
                    <div className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                      {startTime}{endTime && ` - ${endTime}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {baan?.naam && <span className="text-sm text-gray-600">{baan.naam}</span>}
                    {baan?.overdekt && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                        Overdekt
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-2">
                    {toewijzingen.map((t) => {
                      const team = teams.find((team) => team.id === t.team_id);
                      return (
                        <div key={t.id} className="bg-gray-50 p-2 rounded">
                          <span className="font-medium block">{team?.naam || "-"}</span>
                          {t.notitie && (
                            <span className="text-sm text-gray-500 block mt-1">{t.notitie}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 bg-yellow-50 text-yellow-800 text-sm">
              Bewerkmodus is op dit moment niet geoptimaliseerd voor mobiel. Gebruik een computer of tablet in landscape modus voor drag & drop.
            </div>
          )}
        </div>

        {unassignedTeams.length > 0 && (
          <div className="p-4 bg-orange-50 border-t border-orange-200">
            <h3 className="font-medium text-orange-800 mb-2">Niet ingepland:</h3>
            <div className="flex flex-wrap gap-2">
              {unassignedTeams.map((t) => (
                <span
                  key={t.id}
                  className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm"
                >
                  {t.naam}
                </span>
              ))}
            </div>
          </div>
        )}

        {ronde.toewijzingen?.length === 0 && !isReadOnly && (
          <div className="p-8 text-center text-gray-500">
            Geen toewijzingen. Klik op "Genereer indeling" om teams automatisch te verdelen.
          </div>
        )}
      </div>
    </div>
  );
}