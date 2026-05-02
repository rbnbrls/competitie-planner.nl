/*
 * File: frontend/src/components/onboarding/CourtsStep.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useState } from "react";
import { onboardingApi, ApiError } from "../../lib/api";
import { InfoIcon } from "../icons/InfoIcon";

interface Court {
  naam: string;
  ondergrond: string;
  prioriteit_score: number;
  nummer?: number;
}

interface CourtsStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function CourtsStep({ onNext, onBack }: CourtsStepProps) {
  const [courts, setCourts] = useState<Court[]>([
    { naam: "", ondergrond: "gravel", prioriteit_score: 5, nummer: 1 }
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const ondergrondOptions = [
    { value: "gravel", label: "Gravel" },
    { value: "hard", label: "Hardcourt" },
    { value: "gras", label: "Gras" },
    { value: "tapijt", label: "Tapijt" },
  ];

  const addCourt = () => {
    setCourts([
      ...courts,
      { naam: "", ondergrond: "gravel", prioriteit_score: 5, nummer: courts.length + 1 }
    ]);
  };

  const removeCourt = (index: number) => {
    if (courts.length > 1) {
      const updated = courts.filter((_, i) => i !== index);
      setCourts(updated.map((c, i) => ({ ...c, nummer: i + 1 })));
    }
  };

  const updateCourt = (index: number, field: keyof Court, value: string | number) => {
    const updated = [...courts];
    updated[index] = { ...updated[index], [field]: value };
    setCourts(updated);
    if (errors[`baan_${index}`]) {
      setErrors(prev => ({ ...prev, [`baan_${index}`]: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    courts.forEach((court, index) => {
      if (!court.naam.trim()) {
        newErrors[`baan_${index}`] = `Vul een naam in voor baan ${index + 1}`;
      }
    });
    
    const nummers = courts.map(c => c.nummer).filter(n => n !== undefined);
    const hasDuplicates = nummers.length !== new Set(nummers).size;
    if (hasDuplicates) {
      newErrors.algemeen = "Baanummers mogen niet dubbel zijn";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsLoading(true);
    try {
      await onboardingApi.saveCourts({
        banen: courts.map(c => ({
          naam: c.naam.trim(),
          ondergrond: c.ondergrond,
          prioriteit_score: c.prioriteit_score,
          nummer: c.nummer,
        }))
      });
      onNext();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.data?.detail) {
        setErrors({ algemeen: error.data.detail as string });
      } else {
        setErrors({ algemeen: "Er is iets misgegaan. Probeer het opnieuw." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Stap 2: Tennisbanen toevoegen</h2>
      <p className="text-gray-600 mb-4">
        Voeg de tennisbanen van je vereniging toe. Je kunt meerdere banen toevoegen.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-2 text-blue-700 font-semibold"
        >
          <InfoIcon />
          Wat is de prioriteitsscore?
        </button>
        {showHelp && (
          <div className="mt-3 text-gray-700 text-lg leading-relaxed">
            <p>
              De <strong>prioriteitsscore</strong> bepaalt hoeveel een baan wordt gebruikt bij het plannen van competities.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Score van <strong>10</strong>: baan wordt het meest ingepland</li>
              <li>Score van <strong>1</strong>: baan wordt het minst ingepland</li>
              <li>Score van <strong>5</strong>: standaard prioriteit</li>
            </ul>
          </div>
        )}
      </div>

      {errors.algemeen && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-lg">
          {errors.algemeen}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {courts.map((court, index) => (
          <div key={index} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Baan {index + 1}</h3>
              {courts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCourt(index)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Verwijderen
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label htmlFor={`court_naam_${index}`} className="block text-lg font-semibold text-gray-700 mb-2">
                   Naam <span className="text-red-500">*</span>
                 </label>
                 <input
                   type="text"
                   id={`court_naam_${index}`}
                   value={court.naam}
                   onChange={(e) => updateCourt(index, "naam", e.target.value)}
                   className={`w-full p-4 text-lg border-2 rounded-lg transition-colors ${
                     errors[`baan_${index}`] 
                       ? "border-red-400 bg-red-50" 
                       : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                   }`}
                   placeholder="Bijv. Baan 1 - Gravel"
                 />
                 {errors[`baan_${index}`] && (
                   <p className="mt-2 text-lg text-red-600 font-medium">{errors[`baan_${index}`]}</p>
                 )}
               </div>

               <div>
                 <label htmlFor={`court_ondergrond_${index}`} className="block text-lg font-semibold text-gray-700 mb-2">
                   Ondergrond <span className="text-red-500">*</span>
                 </label>
                 <select
                   id={`court_ondergrond_${index}`}
                   value={court.ondergrond}
                   onChange={(e) => updateCourt(index, "ondergrond", e.target.value)}
                   className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                 >
                   {ondergrondOptions.map(opt => (
                     <option key={opt.value} value={opt.value}>{opt.label}</option>
                   ))}
                 </select>
               </div>

                <div className="md:col-span-2">
                  <label id={`court_prioriteit_score_label_${index}`} htmlFor={`court_prioriteit_score_${index}`} className="block text-lg font-semibold text-gray-700 mb-2">
                    Prioriteitsscore: <span className="text-blue-600 font-bold">{court.prioriteit_score}</span>
                  </label>
                  <input
                    id={`court_prioriteit_score_${index}`}
                    type="range"
                    min="1"
                    max="10"
                    value={court.prioriteit_score}
                    onChange={(e) => updateCourt(index, "prioriteit_score", parseInt(e.target.value))}
                    aria-valuemin="1"
                    aria-valuemax="10"
                    aria-valuenow={court.prioriteit_score}
                    aria-labelledby={`court_prioriteit_score_label_${index}`}
                    className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-300"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>1 - Minst gebruikt</span>
                    <span>10 - Meest gebruikt</span>
                  </div>
                </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addCourt}
          className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-600 font-semibold rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + Nog een baan toevoegen
        </button>

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