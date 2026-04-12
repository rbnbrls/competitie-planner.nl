import { useState, useEffect, useCallback } from "react";
import { tenantApi } from "../../lib/api";
import { useParams } from "react-router-dom";
import { 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  Activity,
  Trophy
} from "lucide-react";
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
  LoadingSkeleton
} from "../../components";

interface Competitie {
  competitie_id: string;
  team_naam: string;
  competitie_naam: string;
  divisie: string;
  banen_nodig: number;
  voorkeur_tijd: string;
  speeldag: string | null;
}

interface Dagoverzicht {
  datum: string;
  club_id: string;
  club_naam: string;
  beschikbare_banen: number;
  max_thuisteams_per_dag: number;
  competities: Competitie[];
  training_gepland: boolean;
  vrije_spelers: boolean;
  conflict_warning: boolean;
  totaal_banen_nodig: number;
  beschikbaarheid: Record<string, number>;
}

export default function DagoverzichtPage() {
  const params = useParams();
  const [datum, setDatum] = useState<string>(
    params.datum || new Date().toISOString().split("T")[0]
  );
  const [dagoverzicht, setDagoverzicht] = useState<Dagoverzicht | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDagoverzicht = useCallback(() => {
    setIsLoading(true);
    tenantApi
      .getDagoverzicht(datum)
      .then((res) => {
        setDagoverzicht(res.data);
      })
      .catch((err) => {
        showToast.error("Kon dagoverzicht niet laden");
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [datum]);

  useEffect(() => {
    loadDagoverzicht();
  }, [loadDagoverzicht]);

  const getStatusConfig = () => {
    if (!dagoverzicht) return { color: "bg-gray-100", label: "Onbekend", icon: Info, variant: "default" as const };
    
    const hasValidCapacity = dagoverzicht.beschikbare_banen > 0;
    
    if (!hasValidCapacity) {
      return { color: "bg-gray-100 text-gray-600 border-gray-200", label: "Geen banen ingesteld", icon: Info, variant: "default" as const };
    }
    
    if (dagoverzicht.conflict_warning) {
      return { color: "bg-red-50 text-red-800 border-red-200", label: "Capaciteitsoverschrijding", icon: AlertTriangle, variant: "danger" as const };
    }
    
    if (dagoverzicht.totaal_banen_nodig > dagoverzicht.beschikbare_banen * 0.75) {
      return { color: "bg-amber-50 text-amber-800 border-amber-200", label: "Hoge parkdruk", icon: Clock, variant: "warning" as const };
    }
    
    return { color: "bg-emerald-50 text-emerald-800 border-emerald-200", label: "Parkruimte beschikbaar", icon: CheckCircle2, variant: "success" as const };
  };

  const formatDatum = (datumStr: string) => {
    const d = new Date(datumStr + "T00:00:00");
    return d.toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const adjustDate = (days: number) => {
    const current = new Date(datum + "T00:00:00");
    current.setDate(current.getDate() + days);
    setDatum(current.toISOString().split("T")[0]);
  };

  if (isLoading) return <LoadingSkeleton rows={10} />;

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  const hasValidCapacity = dagoverzicht && Number.isFinite(dagoverzicht.beschikbare_banen) && dagoverzicht.beschikbare_banen > 0;
  const parkdrukPercentage = hasValidCapacity ? Math.round((dagoverzicht.totaal_banen_nodig / dagoverzicht.beschikbare_banen) * 100) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 border-none p-0">Dagoverzicht</h1>
          <p className="text-gray-500 font-medium">Overzicht van parkbezetting en competities op een specifieke dag.</p>
        </div>
        
        <Card className="flex items-center gap-2 p-1 bg-gray-100 border-none shadow-inner rounded-xl w-full md:w-auto">
           <Button variant="ghost" size="icon" onClick={() => adjustDate(-1)} className="hover:bg-white transition-colors h-10 w-10">
              <ChevronLeft size={20} />
           </Button>
           <div className="relative group">
              <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600" />
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className="pl-10 pr-4 h-10 bg-white border border-transparent rounded-lg text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm"
              />
           </div>
           <Button variant="ghost" size="icon" onClick={() => adjustDate(1)} className="hover:bg-white transition-colors h-10 w-10">
              <ChevronRight size={20} />
           </Button>
        </Card>
      </div>

      {!dagoverzicht ? (
         <div className="py-20 text-center font-bold text-gray-400 border-2 border-dashed rounded-3xl">Geen gegevens voor deze datum.</div>
      ) : (
        <div className="space-y-8">
          {/* Status Banner */}
          <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm ${status.color}`}>
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="p-3 bg-white/50 rounded-2xl border border-current/10">
                <StatusIcon size={32} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">
                  {formatDatum(dagoverzicht.datum)}
                </h2>
                <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                   <Badge variant={status.variant} className="px-3 py-1 font-black uppercase text-[10px] tracking-widest">{status.label}</Badge>
                   <span className="text-sm font-medium opacity-70">bij {dagoverzicht.club_naam}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
               <div className="text-center px-4 py-2 bg-white/30 rounded-xl border border-current/5">
                 <div className="text-[10px] font-black uppercase tracking-tighter opacity-60">Park Druk</div>
                 <div className="text-2xl font-black">{parkdrukPercentage !== null ? `${parkdrukPercentage}%` : "—"}</div>
               </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm ring-1 ring-gray-100 flex items-center justify-between p-6">
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Beschikbare banen</p>
                 <p className="text-4xl font-black text-gray-900">{dagoverzicht.beschikbare_banen}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                 <Layers size={24} />
              </div>
            </Card>

            <Card className="border-none shadow-sm ring-1 ring-gray-100 flex items-center justify-between p-6">
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Banen in gebruik</p>
                 <p className="text-4xl font-black text-gray-900">{dagoverzicht.totaal_banen_nodig}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                 <Activity size={24} />
              </div>
            </Card>

            <Card className="border-none shadow-sm ring-1 ring-gray-100 flex items-center justify-between p-6">
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Max thuisteams</p>
                 <p className="text-4xl font-black text-gray-900">{dagoverzicht.max_thuisteams_per_dag}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                 <Users size={24} />
              </div>
            </Card>
          </div>

          {/* Table Section */}
          <section className="space-y-4">
             <div className="flex items-center gap-3 px-1">
               <div className="p-2 bg-blue-600 rounded-lg text-white">
                 <Trophy size={18} />
               </div>
               <h3 className="text-xl font-black text-gray-900">
                 Thuisspelende Teams
               </h3>
               <Badge variant="outline" className="ml-2">{dagoverzicht.competities.length}</Badge>
             </div>

             <Card className="overflow-hidden border-none ring-1 ring-gray-100 shadow-sm">
               <Table>
                 <TableHeader className="bg-gray-50/50">
                   <TableRow>
                     <TableHead>Team</TableHead>
                     <TableHead>Competitie</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Banen nodig</TableHead>
                     <TableHead className="text-right">Voorkeur tijd</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {dagoverzicht.competities.map((comp) => (
                     <TableRow key={comp.competitie_id} className="group hover:bg-blue-50/30 transition-colors">
                       <TableCell className="font-black text-gray-900 leading-tight">
                         {comp.team_naam}
                         {comp.divisie && <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{comp.divisie}</p>}
                       </TableCell>
                       <TableCell className="font-medium text-gray-600">{comp.competitie_naam}</TableCell>
                       <TableCell>
                          <Badge variant={comp.speeldag ? "success" : "default"} className="font-bold text-[10px]">
                            {comp.speeldag || "Planning n.n.b."}
                          </Badge>
                       </TableCell>
                       <TableCell>
                         <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-black w-fit border border-blue-100">
                           {comp.banen_nodig}
                         </div>
                       </TableCell>
                       <TableCell className="text-right">
                         <Badge variant="outline" className="gap-1.5 font-bold">
                           <Clock size={12} />
                           {comp.voorkeur_tijd}
                         </Badge>
                       </TableCell>
                     </TableRow>
                   ))}
                   {dagoverzicht.competities.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={5} className="h-40 text-center text-gray-400 font-medium italic">
                         Geen thuiswedstrijden gepland op deze datum.
                       </TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </Card>
          </section>

          {/* Availability Grid */}
          <section className="space-y-4">
             <div className="flex items-center gap-3 px-1">
               <div className="p-2 bg-indigo-600 rounded-lg text-white">
                 <Clock size={18} />
               </div>
               <h3 className="text-xl font-black text-gray-900">
                 Baanbeschikbaarheid per blok
               </h3>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
               {Object.entries(dagoverzicht.beschikbaarheid).map(([tijd, aantal]) => {
                 const isCriticallyLow = aantal <= 1;
                 return (
                   <Card key={tijd} className={`border-none ring-1 shadow-sm transition-all hover:translate-y-[-2px] ${isCriticallyLow ? 'ring-red-100 bg-red-50/30' : 'ring-gray-100 bg-white'}`}>
                     <CardContent className="p-4 text-center space-y-1">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{tijd}</p>
                       <p className={`text-2xl font-black ${isCriticallyLow ? 'text-red-600' : 'text-gray-900'}`}>{aantal}</p>
                       <p className="text-[9px] font-bold text-gray-400 uppercase">Vrij</p>
                     </CardContent>
                   </Card>
                 );
               })}
             </div>
          </section>

          {/* Warnings */}
          {(dagoverzicht.training_gepland || dagoverzicht.vrije_spelers) && (
            <Card className="bg-amber-50 border-amber-100">
              <CardContent className="p-6 flex items-start gap-4">
                 <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                    <Info size={24} />
                 </div>
                 <div>
                    <h3 className="font-black text-amber-900">
                      Beperkte baanruimte door nevenactiviteiten
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {dagoverzicht.training_gepland && (
                        <Badge variant="outline" className="bg-white border-amber-200 text-amber-700">Trainingen actief</Badge>
                      )}
                      {dagoverzicht.vrije_spelers && (
                        <Badge variant="outline" className="bg-white border-amber-200 text-amber-700">Vrije spelers (voorheen gepland)</Badge>
                      )}
                    </div>
                 </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}