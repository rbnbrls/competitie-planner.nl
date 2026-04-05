import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { tenantApi } from "../../lib/api";

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

export default function SpeelrondesPage() {
  const { competitieId } = useParams<{ competitieId: string }>();
  const [rondes, setRondes] = useState<Speelronde[]>([]);
  const [competitie, setCompetitie] = useState<Competitie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (competitieId) {
      loadData();
    }
  }, [competitieId]);

  const loadData = () => {
    if (!competitieId) return;
    
    Promise.all([
      tenantApi.getCompetition(competitieId),
      tenantApi.listSpeelrondes(competitieId),
    ]).then(([compRes, rondesRes]) => {
      setCompetitie(compRes.data.competitie);
      setRondes(rondesRes.data.rondes || []);
    }).finally(() => setIsLoading(false));
  };

  const handleToggleFeestdag = async (ronde: Speelronde) => {
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
      loadData();
    } catch {
      setMessage("Fout bij opslaan");
    }
  };

  const handlePublish = async (rondeId: string) => {
    try {
      await tenantApi.publishSpeelronde(rondeId);
      setMessage("Ronde gepubliceerd");
      loadData();
    } catch {
      setMessage("Fout bij publiceren");
    }
  };

  const copyPublicUrl = (publicToken: string) => {
    const url = `${window.location.origin}/public/ronde/${publicToken}`;
    navigator.clipboard.writeText(url);
    setMessage("URL gekopieerd naar clipboard");
  };

  const filteredRondes = () => {
    if (filter === "all") return rondes;
    return rondes.filter((r) => r.status === filter);
  };

  const getStatusBadge = (ronde: Speelronde) => {
    if (ronde.status === "gepubliceerd") {
      return (
        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
          Gepubliceerd
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
        Concept
      </span>
    );
  };

  const isFeestdag = (ronde: Speelronde) => {
    return competitie?.feestdagen?.includes(ronde.datum) || false;
  };

  const isInhaalronde = (ronde: Speelronde) => {
    return competitie?.inhaal_datums?.includes(ronde.datum) || ronde.is_inhaalronde;
  };

  if (isLoading) {
    return <div className="p-4">Laden...</div>;
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Speelrondes {competitie ? `- ${competitie.naam}` : ""}
        </h1>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes("Fout") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {message}
        </div>
      )}

      <div className="mb-4 flex gap-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Alle ({rondes.length})
        </button>
        <button
          onClick={() => setFilter("concept")}
          className={`px-3 py-1 rounded ${filter === "concept" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Concept ({rondes.filter((r) => r.status === "concept").length})
        </button>
        <button
          onClick={() => setFilter("gepubliceerd")}
          className={`px-3 py-1 rounded ${filter === "gepubliceerd" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Gepubliceerd ({rondes.filter((r) => r.status === "gepubliceerd").length})
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Week
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Datum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Gepubliceerd
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredRondes().map((ronde) => (
              <tr 
                key={ronde.id} 
                className={`hover:bg-gray-50 cursor-pointer ${isFeestdag(ronde) ? "bg-red-50" : ""}`}
                onClick={() => window.location.href = `/ronde/${ronde.id}/${competitieId}`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  {ronde.week_nummer}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(ronde.datum).toLocaleDateString("nl-NL", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isInhaalronde(ronde) ? (
                    <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800">
                      Inhaalronde
                    </span>
                  ) : isFeestdag(ronde) ? (
                    <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">
                      Feestdag
                    </span>
                  ) : (
                    <span className="text-gray-500">Normaal</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(ronde)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {ronde.gepubliceerd_op
                    ? new Date(ronde.gepubliceerd_op).toLocaleString("nl-NL")
                    : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => handleToggleFeestdag(ronde)}
                    className="text-gray-600 hover:text-gray-900 mr-3"
                  >
                    {isFeestdag(ronde) ? "Normaal" : "Feestdag"}
                  </button>
                  {ronde.status === "concept" && (
                    <button
                      onClick={() => handlePublish(ronde.id)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Publiceren
                    </button>
                  )}
                  {ronde.public_token && (
                    <button
                      onClick={() => copyPublicUrl(ronde.public_token || "")}
                      className="text-green-600 hover:text-green-800"
                      title="Kopieer publieke URL"
                    >
                      🔗
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rondes.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Geen speelrondes gevonden
          </div>
        )}
      </div>
    </div>
  );
}