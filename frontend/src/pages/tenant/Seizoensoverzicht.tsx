import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { tenantApi } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { 
  FileSpreadsheet, 
  FileText, 
  ChevronLeft, 
  Info, 
  MousePointer2, 
  Home, 
  Plane, 
  Coffee
} from "lucide-react";
import { showToast } from "../../components/Toast";
import { 
  Button, 
  Badge, 
  Card, 
  LoadingSkeleton,
} from "../../components";

interface Ronde {
  id: string;
  datum: string;
  week_nummer: number | null;
  status: string;
}

interface SeizoensoverzichtEntry {
  ronde_id: string;
  type: "thuis" | "uit" | "vrij";
  label: string;
  details: string | null;
  status: string;
}

interface TeamRow {
  team_id: string;
  team_naam: string;
  planning: SeizoensoverzichtEntry[];
}

interface SeizoensoverzichtData {
  rondes: Ronde[];
  rows: TeamRow[];
}

export default function Seizoensoverzicht() {
  const { competitieId } = useParams<{ competitieId: string }>();
  const navigate = useNavigate();
  useAuth();
  const [data, setData] = useState<SeizoensoverzichtData | null>(null);
  const [competitie, setCompetitie] = useState<{ id: string; naam: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!competitieId) return;

    setIsLoading(true);
    Promise.all([
      tenantApi.getSeizoensoverzicht(competitieId),
      tenantApi.getCompetition(competitieId)
    ])
      .then(([resGrid, resComp]) => {
        setData(resGrid.data);
        setCompetitie(resComp.data.competitie);
      })
      .catch((err) => {
        console.error(err);
        showToast.error("Er is een fout opgetreden bij het laden van het seizoensoverzicht.");
      })
      .finally(() => setIsLoading(false));
  }, [competitieId]);

  const exportCsv = async () => {
    if (!competitieId || !competitie) return;
    try {
      const response = await tenantApi.exportSeizoenCsv(competitieId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seizoensoverzicht_${competitie.naam.toLowerCase().replace(/ /g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast.success("CSV export voltooid");
    } catch (err) {
      console.error(err);
      showToast.error("Fout bij het exporteren naar CSV.");
    }
  };

  const exportPdf = async () => {
    if (!competitieId || !competitie) return;
    try {
      const response = await tenantApi.exportSeizoenPdf(competitieId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seizoensoverzicht_${competitie.naam.toLowerCase().replace(/ /g, "_")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast.success("PDF export voltooid");
    } catch (err) {
      console.error(err);
      showToast.error("Fout bij het exporteren naar PDF.");
    }
  };

  const getEntryStyles = (entry: SeizoensoverzichtEntry) => {
    if (entry.type === "vrij") return "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100";
    if (entry.status === "gepubliceerd") return "bg-green-50 text-green-800 border-green-200 hover:bg-green-100/50 shadow-sm shadow-green-100/20";
    if (entry.status === "concept") return "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/50";
    return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";
  };

  if (isLoading) return <LoadingSkeleton rows={10} />;
  if (!data || !competitie) return <div className="p-20 text-center font-bold text-gray-400">Geen gegevens gevonden.</div>;

  return (
    <div className="max-w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-blue-600 -ml-2 gap-2 font-bold" 
            onClick={() => navigate(`/rondes/${competitieId}`)}
          >
            <ChevronLeft size={16} /> Terug naar competitie
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
              Seizoensoverzicht
              <Badge variant="primary" className="text-[10px] h-5">MATRIX VIEW</Badge>
            </h1>
            <p className="text-gray-500 font-medium mt-1">Compleet schema van {competitie.naam} per team en ronde.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={exportCsv} className="gap-2 h-11 border-gray-200">
            <FileSpreadsheet size={18} />
            Excel Export
          </Button>
          <Button variant="secondary" onClick={exportPdf} className="gap-2 h-11 border-gray-200">
            <FileText size={18} />
            PDF Export
          </Button>
        </div>
      </div>

      {/* Grid Card */}
      <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden ring-1 ring-gray-100">
        <div className="overflow-x-auto relative">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 backdrop-blur-sm">
                <th className="sticky left-0 z-20 bg-gray-50/95 p-5 text-left font-black text-gray-900 border-r border-gray-200 min-w-[220px] uppercase tracking-tighter text-xs">
                  Teamnaam
                </th>
                {data.rondes.map((ronde) => (
                  <th key={ronde.id} className="p-4 text-center font-black text-gray-900 border-r border-gray-100 min-w-[140px] last:border-r-0">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-blue-500 uppercase tracking-widest mb-1 font-black">
                        Ronde {ronde.week_nummer || "?"}
                      </span>
                      <span className="text-sm font-black">{new Date(ronde.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows.map((row) => (
                <tr key={row.team_id} className="group hover:bg-blue-50/30 transition-colors">
                  <td className="sticky left-0 z-10 bg-white p-5 font-bold text-gray-900 border-r border-gray-200 group-hover:bg-blue-50/50 transition-colors shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                    {row.team_naam}
                  </td>
                  {row.planning.map((entry) => (
                    <td key={entry.ronde_id} className="p-2.5 border-r border-gray-50 last:border-r-0 text-center">
                      <Link
                        to={`/ronde/${entry.ronde_id}/${competitieId}`}
                        className={`group/entry flex flex-col items-center justify-center min-h-[54px] w-full px-2 py-2 rounded-xl border-2 text-xs font-black transition-all ${getEntryStyles(entry)}`}
                      >
                         <div className="flex items-center gap-1.5 mb-1 group-hover/entry:scale-110 transition-transform">
                            {entry.type === 'thuis' && <Home size={12} className="text-blue-500" />}
                            {entry.type === 'uit' && <Plane size={12} className="text-gray-400" />}
                            {entry.type === 'vrij' && <Coffee size={12} className="text-gray-300" />}
                            <span className="tracking-tighter">{entry.label}</span>
                         </div>
                         {entry.details && (
                            <span className="text-[10px] opacity-60 font-medium truncate w-full text-center">
                              {entry.details}
                            </span>
                         )}
                      </Link>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Legend & Help */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-gray-500">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-md bg-green-100 border-2 border-green-200"></div>
            <span className="text-xs uppercase tracking-widest">Gepubliceerd</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-md bg-amber-100 border-2 border-amber-200"></div>
            <span className="text-xs uppercase tracking-widest">Concept</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-md bg-gray-50 border-2 border-gray-100"></div>
            <span className="text-xs uppercase tracking-widest">Leeg / Vrij</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 max-w-md">
           <Info size={16} className="text-blue-600 flex-shrink-0" />
           <p className="text-[11px] text-blue-900 font-medium leading-tight">
             <span className="font-black">Pro Tip:</span> Klik op een cel om direct naar de baanbezetting en details van die specifieke ronde te gaan.
           </p>
           <MousePointer2 size={16} className="text-blue-400 opacity-50" />
        </div>
      </div>
    </div>
  );
}
