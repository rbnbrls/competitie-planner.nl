/*
 * File: frontend/src/pages/tenant/Historie.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { AxiosResponse } from "axios";
import { tenantApi } from "../../lib/api";
import { 
  BarChart3, 
  ChevronLeft, 
  HelpCircle,
  Star
} from "lucide-react";
import { showToast } from "../../components/Toast";
import { 
  Button, 
  Badge, 
  Card, 
  LoadingSkeleton,
  EmptyState,
} from "../../components";

interface HistorieTeamRow {
  team_id: string;
  team_naam: string;
  data: Record<string, number>;
}

interface HistorieBaan {
  id: string;
  nummer: number;
  naam: string | null;
  prioriteit_score: number;
}

interface HistorieData {
  teams: HistorieTeamRow[];
  banen: HistorieBaan[];
}

export default function HistoriePage() {
  const { competitieId } = useParams<{ competitieId: string }>();
  const navigate = useNavigate();
  const [historie, setHistorie] = useState<HistorieData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (competitieId) {
      tenantApi
        .getCompetitieHistorie(competitieId)
        .then((res: AxiosResponse<HistorieData>) => {
          setHistorie(res.data);
        })
        .catch(() => {
          showToast.error("Fout bij laden van historie");
        })
        .finally(() => setIsLoading(false));
    }
  }, [competitieId]);

  const getHeatmapClass = (value: number): string => {
    if (value === 0) return "bg-white text-gray-200 font-light";
    if (value === 1) return "bg-emerald-50 text-emerald-800 font-bold border-2 border-emerald-100/50";
    if (value === 2) return "bg-emerald-100 text-emerald-900 font-black border-2 border-emerald-200/50";
    if (value === 3) return "bg-emerald-200 text-emerald-950 font-black border-2 border-emerald-300/50";
    if (value === 4) return "bg-emerald-300 text-white font-black border-2 border-emerald-400/50";
    return "bg-emerald-500 text-white font-black border-2 border-emerald-600/50";
  };

  if (isLoading) {
    return <LoadingSkeleton rows={10} />;
  }

  if (!historie || historie.teams.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-blue-600 -ml-2 gap-2 font-bold mb-6" 
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={16} /> Terug
        </Button>
        <EmptyState
          icon={BarChart3}
          title="Geen historie beschikbaar"
          description="Zodra speelrondes zijn gepubliceerd en toegewezen, wordt hier de baanverdeling over het seizoen inzichtelijk."
          actionLabel="Ga terug"
          variant="page"
          onAction={() => navigate(-1)}
        />
      </div>
    );
  }

  const sortedBanen = [...historie.banen].sort((a, b) => b.prioriteit_score - a.prioriteit_score);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-blue-600 -ml-2 gap-2 font-bold" 
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={16} /> Terug
        </Button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 border-none p-0 flex items-center gap-3">
              Planning Historie
              <Badge variant="outline" className="text-[10px] h-5 tracking-widest font-black uppercase">Heatmap</Badge>
            </h1>
            <p className="text-gray-500 font-medium mt-1">Overzicht van baanverdeling per team om eerlijkheid te waarborgen.</p>
          </div>
          <div className="p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl flex items-center gap-3 max-w-sm">
             <HelpCircle size={16} className="text-blue-500 flex-shrink-0" />
             <p className="text-[10px] text-blue-900 font-medium leading-tight">
               Hogere getallen betekenen dat het team vaker op die specifieke baan is ingedeeld.
             </p>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden ring-1 ring-gray-100">
        <div className="overflow-x-auto relative">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 backdrop-blur-sm">
                <th className="sticky left-0 z-20 bg-gray-50/95 p-5 text-left font-black text-gray-900 border-r border-gray-200 min-w-[220px] uppercase tracking-tighter text-xs">
                  Teamnaam
                </th>
                {sortedBanen.map((baan) => (
                  <th key={baan.id} className="p-4 text-center font-black text-gray-900 border-r border-gray-100 min-w-[120px] last:border-r-0">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-blue-500 uppercase tracking-widest mb-1 font-black">
                        Baan {baan.nummer}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="font-black">{baan.prioriteit_score}</span>
                      </div>
                      {baan.naam && <span className="text-[10px] text-gray-400 font-medium mt-1 truncate max-w-[100px]">{baan.naam}</span>}
                    </div>
                  </th>
                ))}
                <th className="p-4 text-center font-black text-gray-900 min-w-[100px] bg-blue-50/30">
                   TOTAAL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historie.teams.map((team) => {
                const total = Object.values(team.data).reduce((a, b) => a + b, 0);
                return (
                  <tr key={team.team_id} className="group hover:bg-gray-50 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-5 font-bold text-gray-900 border-r border-gray-200 group-hover:bg-gray-50 transition-colors shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                      {team.team_naam}
                    </td>
                    {sortedBanen.map((baan) => {
                      const value = team.data[baan.id] || 0;
                      return (
                        <td
                          key={baan.id}
                          className="p-1 border-r border-gray-50 last:border-r-0"
                        >
                           <div className={`h-10 w-full flex items-center justify-center rounded-lg text-xs transition-all ${getHeatmapClass(value)}`}>
                             {value > 0 ? value : "-"}
                           </div>
                        </td>
                      );
                    })}
                    <td className="p-4 text-center font-black text-gray-500 bg-gray-50/30">
                       {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-6 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <span className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">Intensiteit:</span>
        <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white border border-gray-100"></div>
            <span>0</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-50 border border-emerald-100"></div>
            <span>1</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-200"></div>
            <span>2</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-200 border border-emerald-300"></div>
            <span>3</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-300 border border-emerald-400"></div>
            <span>4</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500 border border-emerald-600"></div>
            <span>5+</span>
          </div>
        </div>
      </div>
    </div>
  );
}