import { useState, useEffect } from "react";
import { tenantApi } from "../../lib/api";
import { useParams } from "react-router-dom";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDagoverzicht();
  }, [datum]);

  const loadDagoverzicht = () => {
    setIsLoading(true);
    setError(null);
    tenantApi
      .getDagoverzicht(datum)
      .then((res) => {
        setDagoverzicht(res.data);
      })
      .catch((err) => {
        setError("Kon dagoverzicht niet laden");
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const getStatusColor = () => {
    if (!dagoverzicht) return "bg-gray-100";
    if (dagoverzicht.conflict_warning) return "bg-red-100 text-red-800";
    if (dagoverzicht.totaal_banen_nodig > dagoverzicht.beschikbare_banen * 0.75) {
      return "bg-orange-100 text-orange-800";
    }
    return "bg-green-100 text-green-800";
  };

  const getStatusLabel = () => {
    if (!dagoverzicht) return "";
    if (dagoverzicht.conflict_warning) return "Conflict";
    if (dagoverzicht.totaal_banen_nodig > dagoverzicht.beschikbare_banen * 0.75) {
      return "Waarschuwing";
    }
    return "Geen conflict";
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

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dagoverzicht</h1>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Datum:</label>
        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      {isLoading && (
        <div className="text-center py-8 text-gray-500">Laden...</div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {!isLoading && dagoverzicht && (
        <div className="space-y-6">
          <div className={`p-4 rounded-lg ${getStatusColor()}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {formatDatum(dagoverzicht.datum)}
                </h2>
                <p className="text-sm">{dagoverzicht.club_naam}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold">{getStatusLabel()}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Beschikbare banen
              </h3>
              <p className="text-2xl font-bold">{dagoverzicht.beschikbare_banen}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Benodigde banen
              </h3>
              <p className="text-2xl font-bold">{dagoverzicht.totaal_banen_nodig}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Max thuisteams
              </h3>
              <p className="text-2xl font-bold">
                {dagoverzicht.max_thuisteams_per_dag}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                Competities met thuiswedstrijden
              </h3>
            </div>
            {dagoverzicht.competities.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Geen thuiswedstrijden op deze datum
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Competitie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Speeldag
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Banen nodig
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Voorkeur tijd
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dagoverzicht.competities.map((comp) => (
                    <tr key={comp.competitie_id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        {comp.team_naam}
                      </td>
                      <td className="px-6 py-4">{comp.competitie_naam}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {comp.speeldag || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                          {comp.banen_nodig} baan{comp.banen_nodig !== 1 ? "en" : ""}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {comp.voorkeur_tijd}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Beschikbaarheid per tijdblok</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(dagoverzicht.beschikbaarheid).map(
                  ([tijd, aantal]) => (
                    <div key={tijd} className="text-center">
                      <p className="text-sm text-gray-500 mb-1">{tijd}</p>
                      <p className="text-xl font-bold">{aantal}</p>
                      <p className="text-xs text-gray-400">beschikbaar</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {(dagoverzicht.training_gepland || dagoverzicht.vrije_spelers) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">
                Overige reserveringen
              </h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                {dagoverzicht.training_gepland && (
                  <li>Training gepland</li>
                )}
                {dagoverzicht.vrije_spelers && (
                  <li>Vrije spelers actief</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}