import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { tenantApi } from "../../lib/api";
import { Clock, Calendar, Settings } from "lucide-react";

interface Competitie {
  id: string;
  naam: string;
  speeldag: string;
  start_datum: string;
  eind_datum: string;
  actief: boolean;
  feestdagen: string[];
  inhaal_datums: string[];
  standaard_starttijden?: string[];
  eerste_datum?: string;
  hergebruik_configuratie?: boolean;
  created_at: string;
}

interface TijdslotConfig {
  standaard_starttijden: string[];
  eerste_datum: string | null;
  hergebruik_configuratie: boolean;
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
  const [showTijdslotModal, setShowTijdslotModal] = useState(false);
  const [selectedCompetitie, setSelectedCompetitie] = useState<Competitie | null>(null);
  const [tijdslotConfig, setTijdslotConfig] = useState<TijdslotConfig>({
    standaard_starttijden: [],
    eerste_datum: null,
    hergebruik_configuratie: true,
  });
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

  const loadTijdslotConfig = async (competitieId: string) => {
    try {
      const res = await tenantApi.getTijdslotConfig(competitieId);
      setTijdslotConfig(res.data);
    } catch (err) {
      setTijdslotConfig({
        standaard_starttijden: [],
        eerste_datum: null,
        hergebruik_configuratie: true,
      });
    }
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

  const handleOpenTijdslotConfig = (comp: Competitie) => {
    setSelectedCompetitie(comp);
    loadTijdslotConfig(comp.id);
    setShowTijdslotModal(true);
  };

  const handleSaveTijdslotConfig = async () => {
    if (!selectedCompetitie) return;
    setIsSaving(true);
    try {
      await tenantApi.updateTijdslotConfig(selectedCompetitie.id, {
        standaard_starttijden: tijdslotConfig.standaard_starttijden,
        eerste_datum: tijdslotConfig.eerste_datum || undefined,
        hergebruik_configuratie: tijdslotConfig.hergebruik_configuratie,
      });
      setMessage("Tijdslotconfiguratie opgeslagen");
      loadCompetities();
      setShowTijdslotModal(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setMessage(error.response?.data?.detail || "Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  const addTijdslot = () => {
    setTijdslotConfig({
      ...tijdslotConfig,
      standaard_starttijden: [...tijdslotConfig.standaard_starttijden, "19:00"],
    });
  };

  const removeTijdslot = (index: number) => {
    const newTimes = [...tijdslotConfig.standaard_starttijden];
    newTimes.splice(index, 1);
    setTijdslotConfig({ ...tijdslotConfig, standaard_starttijden: newTimes });
  };

  const updateTijdslot = (index: number, value: string) => {
    const newTimes = [...tijdslotConfig.standaard_starttijden];
    newTimes[index] = value;
    setTijdslotConfig({ ...tijdslotConfig, standaard_starttijden: newTimes });
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
              {activeComp.standaard_starttijden && activeComp.standaard_starttijden.length > 0 && (
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Clock size={12} />
                  Standaardtijden: {activeComp.standaard_starttijden.join(", ")}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleOpenTijdslotConfig(activeComp)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                <Settings size={16} />
                Tijdslotconfig
              </button>
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
                Standaardtijden
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
                  {comp.standaard_starttijden && comp.standaard_starttijden.length > 0 ? (
                    <span className="text-sm text-gray-600">
                      {comp.standaard_starttijden.join(", ")}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
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
                    onClick={() => handleOpenTijdslotConfig(comp)}
                    className="text-gray-600 hover:text-gray-800 mr-3"
                    title="Tijdslotconfiguratie"
                  >
                    <Clock size={16} />
                  </button>
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

      {showTijdslotModal && selectedCompetitie && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              Tijdslotconfiguratie - {selectedCompetitie.naam}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Standaard aanvangstijden
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Definieer de standaardtijden die automatisch worden toegepast bij nieuwe rondes.
                </p>
                <div className="space-y-2">
                  {tijdslotConfig.standaard_starttijden.map((tijd, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="time"
                        value={tijd}
                        onChange={(e) => updateTijdslot(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeTijdslot(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        Verwijder
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addTijdslot}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  + Tijd toevoegen
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar size={14} className="inline mr-1" />
                  Eerste speeldatum (optioneel)
                </label>
                <input
                  type="date"
                  value={tijdslotConfig.eerste_datum || ""}
                  onChange={(e) =>
                    setTijdslotConfig({
                      ...tijdslotConfig,
                      eerste_datum: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tijdslotConfig.hergebruik_configuratie}
                    onChange={(e) =>
                      setTijdslotConfig({
                        ...tijdslotConfig,
                        hergebruik_configuratie: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Configuratie hergebruiken bij nieuwe seizoensplanning
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowTijdslotModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleSaveTijdslotConfig}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Opslaan..." : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}