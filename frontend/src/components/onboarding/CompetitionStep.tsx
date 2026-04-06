import { useState } from "react";
import { onboardingApi } from "../../lib/api";

interface CompetitionStepProps {
  onNext: (competitieId: string) => void;
  onBack: () => void;
}

export default function CompetitionStep({ onNext, onBack }: CompetitionStepProps) {
  const [formData, setFormData] = useState({
    naam: "",
    speeldag: "zaterdag",
    start_datum: "",
    eind_datum: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const speeldagOptions = [
    { value: "maandag", label: "Maandag" },
    { value: "dinsdag", label: "Dinsdag" },
    { value: "woensdag", label: "Woensdag" },
    { value: "donderdag", label: "Donderdag" },
    { value: "vrijdag", label: "Vrijdag" },
    { value: "zaterdag", label: "Zaterdag" },
    { value: "zondag", label: "Zondag" },
  ];

  const getToday = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.naam.trim()) {
      newErrors.naam = "Vul een naam in voor de competitie";
    }
    
    if (!formData.start_datum) {
      newErrors.start_datum = "Selecteer een startdatum";
    } else if (formData.start_datum < getToday()) {
      newErrors.start_datum = "De startdatum moet in de toekomst liggen";
    }
    
    if (!formData.eind_datum) {
      newErrors.eind_datum = "Selecteer een einddatum";
    } else if (formData.start_datum && formData.eind_datum <= formData.start_datum) {
      newErrors.eind_datum = "De einddatum moet na de startdatum liggen";
    } else if (formData.start_datum && formData.eind_datum) {
      const start = new Date(formData.start_datum);
      const end = new Date(formData.eind_datum);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 28) {
        newErrors.eind_datum = "De competitie moet minimaal 4 weken duren";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await onboardingApi.saveCompetition({
        naam: formData.naam.trim(),
        speeldag: formData.speeldag,
        start_datum: formData.start_datum,
        eind_datum: formData.eind_datum,
      });
      onNext(response.data.competitie_id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      if (err.response?.data?.detail) {
        setErrors({ algemeen: err.response.data.detail });
      } else {
        setErrors({ algemeen: "Er is iets misgegaan. Probeer het opnieuw." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Stap 3: Eerste competitie aanmaken</h2>
      <p className="text-gray-600 mb-4">
        Maak een nieuwe competitie aan voor je vereniging.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-2 text-blue-700 font-semibold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Wat is een competitieperiode?
        </button>
        {showHelp && (
          <div className="mt-3 text-gray-700 text-lg leading-relaxed">
            <p>
              Kies een <strong>vaste speeldag</strong> voor de competitie. Dit is de dag waarop alle wedstrijden standaard worden gespeeld.
            </p>
            <p className="mt-2">
              Geef ook de <strong>start- en einddatum</strong> aan voor de competitieperiode. Dit is de periode waarin alle speelrondes gepland worden.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Tip: Zorg dat de competitie minimaal 4 weken duurt voor voldoende speelrondes.
            </p>
          </div>
        )}
      </div>

      {errors.algemeen && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-lg">
          {errors.algemeen}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="naam" className="block text-lg font-semibold text-gray-700 mb-2">
            Naam competitie <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="naam"
            value={formData.naam}
            onChange={(e) => handleChange("naam", e.target.value)}
            className={`w-full p-4 text-lg border-2 rounded-lg transition-colors ${
              errors.naam 
                ? "border-red-400 bg-red-50" 
                : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            }`}
            placeholder="Bijv. Zomercompetitie 2025"
          />
          {errors.naam && (
            <p className="mt-2 text-lg text-red-600 font-medium">{errors.naam}</p>
          )}
        </div>

        <div>
          <label htmlFor="speeldag" className="block text-lg font-semibold text-gray-700 mb-2">
            Speeldag <span className="text-red-500">*</span>
          </label>
          <select
            id="speeldag"
            value={formData.speeldag}
            onChange={(e) => handleChange("speeldag", e.target.value)}
            className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
          >
            {speeldagOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">Dit is de dag waarop de wedstrijden standaard worden gespeeld</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_datum" className="block text-lg font-semibold text-gray-700 mb-2">
              Startdatum <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="start_datum"
              min={getMinDate()}
              value={formData.start_datum}
              onChange={(e) => handleChange("start_datum", e.target.value)}
              className={`w-full p-4 text-lg border-2 rounded-lg transition-colors ${
                errors.start_datum 
                  ? "border-red-400 bg-red-50" 
                  : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              }`}
            />
            {errors.start_datum && (
              <p className="mt-2 text-lg text-red-600 font-medium">{errors.start_datum}</p>
            )}
          </div>

          <div>
            <label htmlFor="eind_datum" className="block text-lg font-semibold text-gray-700 mb-2">
              Einddatum <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="eind_datum"
              min={formData.start_datum || getMinDate()}
              value={formData.eind_datum}
              onChange={(e) => handleChange("eind_datum", e.target.value)}
              className={`w-full p-4 text-lg border-2 rounded-lg transition-colors ${
                errors.eind_datum 
                  ? "border-red-400 bg-red-50" 
                  : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              }`}
            />
            {errors.eind_datum && (
              <p className="mt-2 text-lg text-red-600 font-medium">{errors.eind_datum}</p>
            )}
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={onBack}
            className="px-8 py-4 bg-gray-200 text-gray-700 text-lg font-bold rounded-lg hover:bg-gray-300 focus:ring-4 focus:ring-gray-200 transition-all"
          >
            Terug
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Opslaan..." : "Volgende stap"}
          </button>
        </div>
      </form>
    </div>
  );
}