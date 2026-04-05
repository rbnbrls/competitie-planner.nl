import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { tenantApi } from "../../lib/api";

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
  const [historie, setHistorie] = useState<HistorieData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (competitieId) {
      tenantApi
        .getCompetitieHistorie(competitieId)
        .then((res: any) => {
          setHistorie(res.data);
        })
        .finally(() => setIsLoading(false));
    }
  }, [competitieId]);

  const getHeatmapClass = (value: number): string => {
    if (value === 0) return "bg-white";
    if (value === 1) return "bg-green-100";
    if (value === 2) return "bg-green-200";
    if (value === 3) return "bg-green-300";
    if (value === 4) return "bg-green-400";
    return "bg-green-500";
  };

  if (isLoading) {
    return <div className="p-4">Laden...</div>;
  }

  if (!historie || historie.teams.length === 0) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold mb-6">Historie</h1>
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Nog geen historie beschikbaar. Na het publiceren van speelrondes zal de historie zichtbaar worden.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Historie - Baanverdeling per team</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
                  Team
                </th>
                {historie.banen
                  .sort((a, b) => b.prioriteit_score - a.prioriteit_score)
                  .map((baan) => (
                    <th
                      key={baan.id}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                    >
                      <div>Baan {baan.nummer}</div>
                      {baan.naam && (
                        <div className="text-xs text-gray-400 font-normal">{baan.naam}</div>
                      )}
                      <div className="text-xs text-gray-400 font-normal">
                        (prioriteit: {baan.prioriteit_score})
                      </div>
                    </th>
                  ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Totaal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {historie.teams.map((team) => {
                const total = Object.values(team.data).reduce((a, b) => a + b, 0);
                return (
                  <tr key={team.team_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium sticky left-0 bg-white z-10">
                      {team.team_naam}
                    </td>
                    {historie.banen
                      .sort((a, b) => b.prioriteit_score - a.prioriteit_score)
                      .map((baan) => {
                        const value = team.data[baan.id] || 0;
                        return (
                          <td
                            key={baan.id}
                            className={`px-4 py-3 text-center ${getHeatmapClass(value)}`}
                          >
                            {value > 0 ? value : "-"}
                          </td>
                        );
                      })}
                    <td className="px-4 py-3 text-center font-medium">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
        <span className="font-medium">Legenda:</span>
        <span className="px-2 py-1 bg-white border rounded">0 (niet gespeeld)</span>
        <span className="px-2 py-1 bg-green-100 border rounded">1</span>
        <span className="px-2 py-1 bg-green-200 border rounded">2</span>
        <span className="px-2 py-1 bg-green-300 border rounded">3</span>
        <span className="px-2 py-1 bg-green-400 border rounded">4</span>
        <span className="px-2 py-1 bg-green-500 border rounded text-white">5+</span>
      </div>
    </div>
  );
}