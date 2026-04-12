import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { tenantApi } from "../../lib/api";
import { CheckCircle, Share2, Wand2, Globe, Clock, Filter, AlertCircle, CloudRain, XCircle } from "lucide-react";
import { showToast } from "../../components/Toast";
import { 
  Button, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell, 
  Badge,
  LoadingSkeleton,
  Card
} from "../../components";

interface Speelronde {
  id: string;
  competitie_id: string;
  datum: string;
  week_nummer: number;
  is_inhaalronde: boolean;
  status: string;
  gepubliceerd_op: string | null;
  public_token: string | null;
}

interface Competitie {
  id: string;
  naam: string;
  feestdagen: string[];
  inhaal_datums: string[];
}

interface WeatherDay {
  icon: string;
  description: string;
  precipitation_mm: number;
  temp_max: number | null;
  regen_verwacht: boolean;
}

export default function SpeelrondesPage() {
  const { competitieId } = useParams<{ competitieId: string }>();
  const navigate = useNavigate();
  const [rondes, setRondes] = useState<Speelronde[]>([]);
  const [competitie, setCompetitie] = useState<Competitie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [isBulkOperationProgress, setIsBulkOperationProgress] = useState<{inProgress: boolean, text: string}>({inProgress: false, text: ""});
  const [lazy, setLazy] = useState(false);
  const [weather, setWeather] = useState<Record<string, WeatherDay>>({});
  
  const loadData = useCallback(() => {
    if (!competitieId) return;
    setIsLoading(true);
    
    Promise.all([
      tenantApi.getCompetition(competitieId),
      tenantApi.listSpeelrondes(competitieId, { lazy }),
      tenantApi.getWeather().catch(() => null),
    ]).then(([compRes, rondesRes, weatherRes]) => {
      setCompetitie(compRes.data);
      setRondes(rondesRes.data.rondes || []);
      if (weatherRes?.data?.enabled && weatherRes.data.weather) {
        setWeather(weatherRes.data.weather);
      }
    }).catch(() => {
      showToast.error("Fout bij laden van speelrondes");
    }).finally(() => setIsLoading(false));
  }, [competitieId, lazy]);

  useEffect(() => {
    if (competitieId) {
      loadData();
    }
  }, [competitieId, loadData]);

  const handleToggleFeestdag = async (e: React.MouseEvent, ronde: Speelronde) => {
    e.stopPropagation();
    if (!competitie || !competitieId) return;

    const currentFeestdagen = competitie.feestdagen || [];
    let newFeestdagen: string[];

    if (currentFeestdagen.includes(ronde.datum)) {
      newFeestdagen = currentFeestdagen.filter((d) => d !== ronde.datum);
    } else {
      newFeestdagen = [...currentFeestdagen, ronde.datum];
    }

    try {
      await tenantApi.updateCompetition(competitieId, { feestdagen: newFeestdagen });
      showToast.success(currentFeestdagen.includes(ronde.datum) ? "Feestdag markering verwijderd" : "Gemarkeerd als feestdag");
      loadData();
    } catch {
      showToast.error("Fout bij opslaan");
    }
  };

  const handlePublish = async (e: React.MouseEvent, rondeId: string) => {
    e.stopPropagation();
    try {
      await tenantApi.publishSpeelronde(rondeId);
      showToast.success("Ronde gepubliceerd");
      loadData();
    } catch {
      showToast.error("Fout bij publiceren");
    }
  };

  const copyPublicUrl = (e: React.MouseEvent, publicToken: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/public/ronde/${publicToken}`;
    navigator.clipboard.writeText(url);
    showToast.success("URL gekopieerd naar clipboard");
  };

  const handleBulkGenerate = async () => {
    if (!competitieId) return;
    const conceptRondeIds = rondes.filter(r => r.status === "concept").map(r => r.id);
    if (conceptRondeIds.length === 0) {
      showToast.error("Geen concept rondes om te genereren.");
      return;
    }
    setIsBulkOperationProgress({inProgress: true, text: `Alle concept-rondes (${conceptRondeIds.length}) aan het genereren...`});
    try {
      await tenantApi.bulkGenerateRondes(competitieId, conceptRondeIds);
      showToast.success(`${conceptRondeIds.length} rondes zijn gegenereerd.`);
      loadData();
    } catch {
      showToast.error("Fout bij bulk genereren.");
    } finally {
      setIsBulkOperationProgress({inProgress: false, text: ""});
    }
  };

  const handleBulkPublish = async () => {
    if (!competitieId) return;
    const conceptRondeIds = rondes.filter(r => r.status === "concept").map(r => r.id);
    if (conceptRondeIds.length === 0) {
      showToast.error("Geen concept rondes om te publiceren.");
      return;
    }
    if (!confirm(`Weet je zeker dat je alle concept-rondes (${conceptRondeIds.length}) wilt publiceren?`)) return;

    setIsBulkOperationProgress({inProgress: true, text: `Alle concept-rondes (${conceptRondeIds.length}) aan het publiceren...`});
    try {
      await tenantApi.bulkPublishRondes(competitieId, conceptRondeIds);
      showToast.success(`${conceptRondeIds.length} concept rondes zijn gepubliceerd.`);
      loadData();
    } catch {
      showToast.error("Fout bij bulk publiceren.");
    } finally {
      setIsBulkOperationProgress({inProgress: false, text: ""});
    }
  };

  const handleAfgelast = async (e: React.MouseEvent, ronde: Speelronde) => {
    e.stopPropagation();
    if (!confirm(`Ronde van ${new Date(ronde.datum).toLocaleDateString("nl-NL")} afgelasten? Captains van thuisteams ontvangen een email.`)) return;
    try {
      await tenantApi.markAfgelast(ronde.id, true);
      showToast.success("Ronde afgelast en captains gemaild");
      loadData();
    } catch {
      showToast.error("Fout bij afgelasten");
    }
  };

  const filteredRondes = () => {
    if (filter === "all") return rondes;
    return rondes.filter((r) => r.status === filter);
  };

  const isFeestdag = (ronde: Speelronde) => {
    return competitie?.feestdagen?.includes(ronde.datum) || false;
  };

  const isInhaalronde = (ronde: Speelronde) => {
    return competitie?.inhaal_datums?.includes(ronde.datum) || ronde.is_inhaalronde;
  };

  if (isLoading) {
    return <LoadingSkeleton rows={10} />;
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Speelrondes {competitie ? `- ${competitie.naam}` : ""}
          </h1>
          <p className="text-gray-500 font-medium">Overzicht van alle rondes in dit seizoen.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleBulkGenerate}
            disabled={isBulkOperationProgress.inProgress}
            className="gap-2"
          >
            <Wand2 size={16} />
            Genereer alle
          </Button>
          <Button
            onClick={handleBulkPublish}
            disabled={isBulkOperationProgress.inProgress}
            className="gap-2"
          >
            <Globe size={16} />
            Publiceer alle
          </Button>
        </div>
      </div>

      {isBulkOperationProgress.inProgress && (
        <Badge variant="secondary" className="w-full py-3 flex justify-center gap-2 animate-pulse">
          {isBulkOperationProgress.text}
        </Badge>
      )}

      <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "all" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Alle ({rondes.length})
          </Button>
          <Button
            variant={filter === "concept" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setFilter("concept")}
          >
            Concept ({rondes.filter((r) => r.status === "concept").length})
          </Button>
          <Button
            variant={filter === "gepubliceerd" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setFilter("gepubliceerd")}
          >
            Gepubliceerd ({rondes.filter((r) => r.status === "gepubliceerd").length})
          </Button>
          {rondes.some(r => r.status === "afgelast") && (
            <Button
              variant={filter === "afgelast" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setFilter("afgelast")}
            >
              Afgelast ({rondes.filter((r) => r.status === "afgelast").length})
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium mr-2">
            <Filter size={14} />
            Filters:
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLazy(!lazy)}
            className="gap-2"
          >
            <Clock size={14} />
            {lazy ? "Toon alles" : "Alleen komende"}
          </Button>
        </div>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Week</TableHead>
            <TableHead>Datum</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            {Object.keys(weather).length > 0 && <TableHead>Weer</TableHead>}
            <TableHead>Publicatie</TableHead>
            <TableHead className="text-right">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRondes().map((ronde) => {
            const w = weather[ronde.datum];
            return (
              <TableRow
                key={ronde.id}
                className={ronde.status === "afgelast" ? "bg-gray-50 opacity-60" : isFeestdag(ronde) ? "bg-red-50/30" : w?.regen_verwacht ? "bg-blue-50/20" : ""}
                onClick={() => navigate(`/ronde/${ronde.id}/${competitieId}`)}
              >
                <TableCell className="font-bold text-gray-600">
                  W{ronde.week_nummer}
                </TableCell>
                <TableCell className="font-semibold">
                  {new Date(ronde.datum).toLocaleDateString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </TableCell>
                <TableCell>
                  {isInhaalronde(ronde) ? (
                    <Badge variant="warning">Inhaalronde</Badge>
                  ) : isFeestdag(ronde) ? (
                    <Badge variant="danger">Feestdag</Badge>
                  ) : (
                    <span className="text-gray-400 text-xs uppercase font-bold tracking-tighter">Normaal</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={ronde.status === "gepubliceerd" ? "success" : ronde.status === "afgelast" ? "danger" : "default"}>
                    {ronde.status === "gepubliceerd" ? "Gepubliceerd" : ronde.status === "afgelast" ? "Afgelast" : "Concept"}
                  </Badge>
                </TableCell>
                {Object.keys(weather).length > 0 && (
                  <TableCell>
                    {w ? (
                      <div className={`flex items-center gap-1 text-sm ${w.regen_verwacht ? "text-blue-600 font-medium" : "text-gray-500"}`} title={`${w.description}${w.precipitation_mm > 0 ? ` · ${w.precipitation_mm}mm` : ""}`}>
                        {w.regen_verwacht && <CloudRain size={13} />}
                        <span>{w.icon}</span>
                        {w.temp_max != null && <span className="text-xs text-gray-400">{w.temp_max}°</span>}
                      </div>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </TableCell>
                )}
                <TableCell className="text-xs text-gray-500">
                  {ronde.gepubliceerd_op ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle size={12} />
                      {new Date(ronde.gepubliceerd_op).toLocaleDateString("nl-NL")}
                    </div>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={isFeestdag(ronde) ? "text-blue-600" : "text-gray-500"}
                      onClick={(e) => handleToggleFeestdag(e, ronde)}
                    >
                      {isFeestdag(ronde) ? "Regulier" : "Feestdag?"}
                    </Button>
                    {ronde.status === "concept" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handlePublish(e, ronde.id)}
                      >
                        Publiceren
                      </Button>
                    )}
                    {ronde.status !== "afgelast" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => handleAfgelast(e, ronde)}
                        title="Afgelasten wegens weer"
                      >
                        <XCircle size={15} />
                      </Button>
                    )}
                    {ronde.public_token && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => copyPublicUrl(e, ronde.public_token || "")}
                        title="Kopieer publieke URL"
                      >
                        <Share2 size={16} className="text-green-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {rondes.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-40 text-center text-gray-500">
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="h-8 w-8 text-gray-300" />
                  <span>Geen speelrondes gevonden.</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}