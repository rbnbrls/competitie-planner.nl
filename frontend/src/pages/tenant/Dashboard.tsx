/*
 * File: frontend/src/pages/tenant/Dashboard.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { tenantApi, onboardingApi } from "../../lib/api";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  Trophy,
  ClipboardList,
  CloudRain
} from "lucide-react";
import { 
  Button, 
  Card, 
  CardContent,
  CardHeader, 
  CardTitle, 
  CardDescription, 
  Badge, 
  LoadingSkeleton,
  EmptyState,
} from "../../components";

interface DashboardRonde {
  id: string;
  competitie_id: string;
  competitie_naam: string;
  datum: string;
  status: string;
  is_inhaalronde: boolean;
  teams_zonder_baan: number;
  totaal_teams: number;
  week_nummer: number | null;
}

interface DashboardActie {
  id: string;
  type: string;
  titel: string;
  beschrijving: string;
  prioriteit: string;
  ronde_id: string | null;
  competitie_id: string | null;
  url: string;
}

interface DashboardCompetitieVoortgang {
  id: string;
  naam: string;
  speeldag: string;
  totaal_rondes: number;
  gepubliceerde_rondes: number;
  percentage: number;
  start_datum: string;
  eind_datum: string;
}

interface DashboardWaarschuwing {
  type: string;
  titel: string;
  bericht: string;
  prioriteit: string;
  url: string | null;
}

interface WeatherDay {
  wmo_code: number;
  icon: string;
  description: string;
  precipitation_mm: number;
  temp_max: number | null;
  temp_min: number | null;
  regen_verwacht: boolean;
}

interface DashboardData {
  club: {
    id: string;
    naam: string;
    slug: string;
    status: string;
    trial_ends_at: string | null;
  };
  gebruiker: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  komende_rondes: DashboardRonde[];
  acties: DashboardActie[];
  competities_voortgang: DashboardCompetitieVoortgang[];
  waarschuwingen: DashboardWaarschuwing[];
  statistieken: {
    totaal_banen: number;
    totaal_teams: number;
    totaal_gebruikers: number;
    aantal_competities: number;
    open_acties: number;
  };
}

export default function TenantDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<{
    step1_completed: boolean;
    step2_completed: boolean;
    step3_completed: boolean;
    step4_completed: boolean;
  } | null>(null);
  const [weather, setWeather] = useState<Record<string, WeatherDay>>({});
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      tenantApi.getDashboard(),
      onboardingApi.getStatus(),
      tenantApi.getWeather().catch(() => null),
    ])
      .then(([dashboardRes, statusRes, weatherRes]) => {
        setData(dashboardRes.data);
        setOnboardingStatus(statusRes.data);
        if (weatherRes?.data?.enabled && weatherRes.data.weather) {
          setWeather(weatherRes.data.weather);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Kon dashboard niet laden. Probeer later opnieuw.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingSkeleton rows={15} />;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold">{error || "Kon dashboard niet laden"}</h2>
        <Button onClick={() => window.location.reload()}>Opnieuw proberen</Button>
      </div>
    );
  }

  const openstaandeTaken = [];
  if (!onboardingStatus?.step1_completed) {
    openstaandeTaken.push({ label: "Club-informatie invullen", url: "/onboarding", icon: <Settings size={16} /> });
  }
  if (!onboardingStatus?.step2_completed) {
    openstaandeTaken.push({ label: "Tennisbanen toevoegen", url: "/onboarding", icon: <Activity size={16} /> });
  }
  if (!onboardingStatus?.step3_completed) {
    openstaandeTaken.push({ label: "Eerste competitie aanmaken", url: "/onboarding", icon: <Trophy size={16} /> });
  }
  if (!onboardingStatus?.step4_completed) {
    openstaandeTaken.push({ label: "Teams toevoegen", url: "/onboarding", icon: <Users size={16} /> });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge variant="primary" className="mb-2 px-3 py-1">Dashboard</Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 border-none p-0">
            Welkom, {data.gebruiker.full_name || data.gebruiker.email.split('@')[0]}
          </h1>
          <p className="text-lg text-gray-500 font-medium">
             Beheer de competities voor <span className="text-blue-600 font-bold">{data.club.naam}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
           <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
           Systeem online
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Banen", value: data.statistieken.totaal_banen, icon: <Activity className="text-blue-600" />, color: "bg-blue-50" },
          { label: "Teams", value: data.statistieken.totaal_teams, icon: <Users className="text-indigo-600" />, color: "bg-indigo-50" },
          { label: "Gebruikers", value: data.statistieken.totaal_gebruikers, icon: <Users className="text-green-600" />, color: "bg-green-50" },
          { label: "Competities", value: data.statistieken.aantal_competities, icon: <Trophy className="text-purple-600" />, color: "bg-purple-50" },
          { label: "Open acties", value: data.statistieken.open_acties, icon: <ClipboardList className={data.statistieken.open_acties > 0 ? "text-amber-600" : "text-gray-400"} />, color: data.statistieken.open_acties > 0 ? "bg-amber-50" : "bg-gray-50" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-none bg-white ring-1 ring-gray-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
                <TrendingUp size={14} className="text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-3xl font-black text-gray-900 leading-none mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Actions / Onboarding */}
          {openstaandeTaken.length > 0 && (
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <LayoutDashboard size={120} />
               </div>
               <CardHeader>
                 <CardTitle className="text-blue-900 flex items-center gap-2">
                   <div className="h-6 w-1 bg-blue-600 rounded-full" />
                   Nog even geduld...
                 </CardTitle>
                 <CardDescription className="text-blue-700">
                   Voltooi de volgende stappen om je club volledig in te richten.
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {openstaandeTaken.map((taak, idx) => (
                     <Link key={idx} to={taak.url} className="group">
                       <div className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded-xl group-hover:border-blue-400 group-hover:shadow-sm transition-all">
                         <div className="flex items-center gap-3">
                           <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                             {taak.icon}
                           </div>
                           <span className="text-sm font-bold text-gray-700">{taak.label}</span>
                         </div>
                         <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-600 translate-x-0 group-hover:translate-x-1 transition-all" />
                       </div>
                     </Link>
                   ))}
                 </div>
               </CardContent>
            </Card>
          )}

          {/* Incoming Rounds */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                 <Calendar className="text-blue-600" size={20} />
                 Aankomende speelrondes
              </h2>
              <Link to="/competities" className="text-blue-600 hover:underline text-sm font-bold flex items-center gap-1">
                Bekijk alles <ArrowRight size={14}/>
              </Link>
            </div>
            
            {data.komende_rondes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Competitie</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Teams zonder baan</TableHead>
                    {Object.keys(weather).length > 0 && <TableHead>Weer</TableHead>}
                    <TableHead className="text-right">Actie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.komende_rondes.map((ronde) => {
                    const w = weather[ronde.datum];
                    return (
                      <TableRow key={ronde.id} className="group">
                        <TableCell>
                          <div className="font-bold text-gray-900">
                            {new Date(ronde.datum).toLocaleDateString("nl-NL", { day: 'numeric', month: 'short' })}
                          </div>
                          <div className="text-xs text-gray-400 font-medium uppercase">Week {ronde.week_nummer}</div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-700">
                          {ronde.competitie_naam}
                          {ronde.is_inhaalronde && <Badge variant="warning" className="ml-2 scale-75 origin-left">Inhaal</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ronde.status === "gepubliceerd" ? "success" : "default"}>
                            {ronde.status === "gepubliceerd" ? "Live" : "Concept"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ronde.teams_zonder_baan > 0 ? (
                            <div className="flex items-center gap-1.5 text-amber-600 font-bold text-sm">
                              <AlertTriangle size={14} />
                              {ronde.teams_zonder_baan} over
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-green-600 font-bold text-sm">
                              <CheckCircle2 size={14} />
                              Compleet
                            </div>
                          )}
                        </TableCell>
                        {Object.keys(weather).length > 0 && (
                          <TableCell>
                            {w ? (
                              <div className={`flex items-center gap-1.5 text-sm font-medium ${w.regen_verwacht ? "text-blue-600" : "text-gray-600"}`} title={w.description}>
                                {w.regen_verwacht && <CloudRain size={14} className="text-blue-500" />}
                                <span className="text-base">{w.icon}</span>
                                {w.temp_max != null && <span className="text-xs text-gray-500">{w.temp_max}°</span>}
                              </div>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <Button
                            variant={ronde.status === "concept" ? "primary" : "secondary"}
                            size="sm"
                            onClick={() => navigate(ronde.status === "concept"
                              ? `/competities/${ronde.competitie_id}/planning/${ronde.id}`
                              : `/ronde/${ronde.id}/${ronde.competitie_id}`)}
                          >
                            {ronde.status === "concept" ? "Plannen" : "Bekijk"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={Calendar}
                title="Geen speelrondes gepland"
                description="Er zijn nog geen speelrondes aangemaakt of geïmporteerd."
                variant="card"
              />
            )}
          </section>
        </div>

        <div className="space-y-8">
          {/* Warnings / Notifications */}
          {(data.waarschuwingen.length > 0 || data.komende_rondes.some(r => weather[r.datum]?.regen_verwacht)) && (
            <section className="space-y-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={18} />
                Meldingen
              </h3>
              {data.komende_rondes.filter(r => weather[r.datum]?.regen_verwacht).map((ronde) => {
                const w = weather[ronde.datum];
                const datum = new Date(ronde.datum).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "long" });
                return (
                  <Card key={`weer-${ronde.id}`} className="border-blue-200 bg-blue-50/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-1 rounded-full bg-blue-500">
                          <CloudRain size={12} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-gray-900">Regen verwacht – {ronde.competitie_naam}</h4>
                          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                            {datum}: {w.description}{w.precipitation_mm > 0 ? ` (${w.precipitation_mm} mm)` : ""}. Overweeg afgelasting bij buitenbanen.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs border-gray-200 bg-white"
                        onClick={() => navigate(`/competities/${ronde.competitie_id}/rondes`)}
                      >
                        Bekijk speelrondes
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
              {data.waarschuwingen.map((w, idx) => (
                <Card key={idx} className={w.prioriteit === "hoog" ? "border-red-200 bg-red-50/30" : "border-amber-200 bg-amber-50/30"}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 p-1 rounded-full ${w.prioriteit === "hoog" ? "bg-red-500" : "bg-amber-500"}`}>
                        <AlertTriangle size={12} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-gray-900">{w.titel}</h4>
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{w.bericht}</p>
                      </div>
                    </div>
                    {w.url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full h-8 text-xs border-gray-200 bg-white" 
                        onClick={() => navigate(w.url!)}
                      >
                        Los dit op
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </section>
          )}

          {/* Quick Actions */}
          <section className="space-y-4 text-gray-900">
            <h3 className="text-lg font-bold">Competitie voortgang</h3>
            {data.competities_voortgang.map((comp) => (
              <Card key={comp.id} className="overflow-hidden group hover:ring-blue-400">
                <CardContent className="p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{comp.naam}</h4>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{comp.speeldag}</p>
                    </div>
                    <div className="text-right">
                       <span className="text-2xl font-black text-gray-900">{comp.percentage}%</span>
                    </div>
                  </div>
                  <div 
                    className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-2"
                    role="progressbar"
                    aria-valuenow={comp.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Voortgang ${comp.naam}: ${comp.percentage}%`}
                  >
                    <div 
                      className="absolute left-0 top-0 h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${comp.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                    <span>{comp.gepubliceerde_rondes} / {comp.totaal_rondes} RONDERS</span>
                    <Link to={`/competities/${comp.id}`} className="text-blue-600 hover:underline">Details {'>'}</Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          {/* Action Tasks */}
          {data.acties.length > 0 && (
             <section className="space-y-4">
               <h3 className="text-lg font-bold">Actielijst</h3>
               <div className="space-y-2">
                 {data.acties.map((actie) => (
                   <div key={actie.id} className="flex gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-all cursor-pointer group" onClick={() => actie.url && navigate(actie.url)}>
                      <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${actie.prioriteit === 'hoog' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-900 leading-tight mb-1 group-hover:text-blue-600">{actie.titel}</div>
                        <p className="text-xs text-gray-500 line-clamp-2">{actie.beschrijving}</p>
                      </div>
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-600 self-center" />
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