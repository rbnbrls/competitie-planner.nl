import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { tenantApi } from "../../lib/api";

interface Competitie {
  id: string;
  naam: string;
  speeldag: string;
  start_datum: string;
  eind_datum: string;
  actief: boolean;
  feestdagen: string[];
  inhaal_datums: string[];
  created_at: string;
}

const DAGEN = [
  { value: "maandag", label: "Maandag" },
  { value: "dinsdag", label: "Dinsdag" },
  { value: "woensdag", label: "Woensdag" },
  { value: "donderdag", label: "Donderdag" },
  { value: "vrijdag", label: "Vrijdag" },
  { value: "zaterdag", label: "Zaterdag" },
  { value: "zondag", label: "Zondag" },
];

export default function CompetitiesPage() {
  const [competities, setCompetities] = useState<Competitie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    naam: "",
    speeldag: "maandag",
    start_datum: "",
    eind_datum: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadCompetities();
  }, []);

  const loadCompetities = () => {
    tenantApi.listCompetities().then((res: any) => {
      setCompetities(res.data.competities || []);
    }).finally(() => setIsLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      await tenantApi.createCompetition(formData);
      setMessage("Competitie aangemaakt");
      loadCompetities();
      setShowModal(false);
      setFormData({
        naam: "",
        speeldag: "maandag",
        start_datum: "",
        eind_datum: "",
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setMessage(error.response?.data?.detail || "Fout bij aanmaken");
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewTeams = (competitieId: string) => {
    navigate(`/teams/${competitieId}`);
  };

  const handleViewRondes = (competitieId: string) => {
    navigate(`/rondes/${competitieId}`);
  };

  const getActiveCompetition = () => {
    return competities.find((c: Competitie) => c.actief);
  };

  if (isLoading) {
    return <div className="p-4">Laden...</div>;
  }

  const activeComp = getActiveCompetition();

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Competities</h1>
        {!activeComp && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Competitie aanmaken
          </button>
        )}
      </div>

      {message && !message.includes("Fout") && (
        <div className="mb-4 p-3 rounded bg-green-100 text-green-700">
          {message}
        </div>
      )}

      {message.includes("Fout") && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700">
          {message}
        </div>
      )}

      {activeComp && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-blue-600 font-medium">Actieve competitie</span>
              <h2 className="text-xl font-bold">{activeComp.naam}</h2>
              <div className="text-sm text-gray-600 mt-1">
                {DAGEN.find((d) => d.value === activeComp.speeldag)?.label} •{" "}
                {new Date(activeComp.start_datum).toLocaleDateString("nl-NL")} t/m{" "}
                {new Date(activeComp.eind_datum).toLocaleDateString("nl-NL")}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/historie/${activeComp.id}`)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Historie
              </button>
              <button
                onClick={() => handleViewRondes(activeComp.id)}
                className="px-4 py-2 bg-white border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
              >
                Speelrondes
              </button>
              <button
                onClick={() => handleViewTeams(activeComp.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Teams
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Naam
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Speeldag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Start - Eind
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {competities.map((comp) => (
              <tr key={comp.id} className={!comp.actief ? "bg-gray-50" : ""}>
                <td className="px-6 py-4 whitespace-nowrap">{comp.naam}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {DAGEN.find((d) => d.value === comp.speeldag)?.label}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(comp.start_datum).toLocaleDateString("nl-NL")} -{" "}
                  {new Date(comp.eind_datum).toLocaleDateString("nl-NL")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      comp.actief
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {comp.actief ? "Actief" : "Inactief"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => handleViewRondes(comp.id)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Rondes
                  </button>
                  <button
                    onClick={() => handleViewTeams(comp.id)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Teams
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {competities.length === 0 && activeComp === null && (
          <div className="p-8 text-center text-gray-500">
            Nog geen competities aangemaakt. Klik op "Competitie aanmaken" om te beginnen.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Nieuwe competitie</h2>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Naam competitie
                  </label>
                  <input
                    type="text"
                    value={formData.naam}
                    onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Bijv. Zomercompetitie 2025"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Speeldag
                  </label>
                  <select
                    value={formData.speeldag}
                    onChange={(e) => setFormData({ ...formData, speeldag: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {DAGEN.map((dag) => (
                      <option key={dag.value} value={dag.value}>
                        {dag.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Startdatum
                  </label>
                  <input
                    type="date"
                    value={formData.start_datum}
                    onChange={(e) => setFormData({ ...formData, start_datum: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Einddatum
                  </label>
                  <input
                    type="date"
                    value={formData.eind_datum}
                    onChange={(e) => setFormData({ ...formData, eind_datum: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-500">
                Na het aanmaken worden alle speelrondes automatisch gegenereerd op de gekozen speeldag.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Aanmaken..." : "Aanmaken"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}