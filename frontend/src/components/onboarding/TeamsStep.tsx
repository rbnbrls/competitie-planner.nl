/*
 * File: frontend/src/components/onboarding/TeamsStep.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useState, useRef } from "react";
import { onboardingApi } from "../../lib/api";

interface Team {
  naam: string;
  captain_naam?: string;
  captain_email?: string;
  speelklasse?: string;
}

interface TeamsStepProps {
  competitieId: string;
  onNext: () => void;
  onBack: () => void;
}

export default function TeamsStep({ competitieId, onNext, onBack }: TeamsStepProps) {
  const [teams, setTeams] = useState<Team[]>([
    { naam: "", captain_naam: "", captain_email: "", speelklasse: "" }
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [importMode, setImportMode] = useState<"manual" | "csv">("manual");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addTeam = () => {
    setTeams([
      ...teams,
      { naam: "", captain_naam: "", captain_email: "", speelklasse: "" }
    ]);
  };

  const removeTeam = (index: number) => {
    if (teams.length > 1) {
      setTeams(teams.filter((_, i) => i !== index));
    }
  };

  const updateTeam = (index: number, field: keyof Team, value: string) => {
    const updated = [...teams];
    updated[index] = { ...updated[index], [field]: value };
    setTeams(updated);
    if (errors[`team_${index}`]) {
      setErrors(prev => ({ ...prev, [`team_${index}`]: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    teams.forEach((team, index) => {
      if (!team.naam.trim()) {
        newErrors[`team_${index}`] = `Vul een naam in voor team ${index + 1}`;
      }
      if (team.captain_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(team.captain_email)) {
        newErrors[`team_${index}_email`] = `Ongeldig e-mailadres voor team ${index + 1}`;
      }
    });
    
    const namen = teams.map(t => t.naam.trim()).filter(n => n);
    const hasDuplicates = namen.length !== new Set(namen).size;
    if (hasDuplicates) {
      newErrors.algemeen = "Teamnamen mogen niet dubbel zijn";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsLoading(true);
    try {
      await onboardingApi.saveTeams(competitieId, {
        teams: teams.filter(t => t.naam.trim()).map(t => ({
          naam: t.naam.trim(),
          captain_naam: t.captain_naam?.trim() || undefined,
          captain_email: t.captain_email?.trim() || undefined,
          speelklasse: t.speelklasse?.trim() || undefined,
        }))
      });
      onNext();
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

  const downloadTemplate = () => {
    const csvContent = "team_naam,captain_naam,captain_email,speelklasse\nTeam A,Jan Jansen,jan@example.com,Heren 1\nTeam B,Piet Pietersen,piet@example.com,Dames 1";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "teams_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      const parsedTeams: Team[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map(p => p.trim());
        if (parts[0]) {
          parsedTeams.push({
            naam: parts[0] || "",
            captain_naam: parts[1] || "",
            captain_email: parts[2] || "",
            speelklasse: parts[3] || "",
          });
        }
      }
      
      if (parsedTeams.length > 0) {
        setTeams([...teams, ...parsedTeams]);
      } else {
        setErrors({ algemeen: "Geen geldige teams gevonden in het bestand" });
      }
    } catch {
      setErrors({ algemeen: "Kon het bestand niet lezen. Gebruik een geldige CSV." });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Stap 4: Teams toevoegen</h2>
      <p className="text-gray-600 mb-4">
        Voeg de teams toe die deelnemen aan je competitie.
      </p>

      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setImportMode("manual")}
          className={`px-6 py-3 text-lg font-semibold rounded-lg transition-colors ${
            importMode === "manual"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Handmatig toevoegen
        </button>
        <button
          type="button"
          onClick={() => setImportMode("csv")}
          className={`px-6 py-3 text-lg font-semibold rounded-lg transition-colors ${
            importMode === "csv"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Importeren via CSV
        </button>
      </div>

      {importMode === "csv" && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Teams importeren uit CSV</h3>
          <p className="text-gray-700 mb-4">
            Kies een bestand met teamnamen en spelersgegevens. Het systeem leest de gegevens automatisch in.
          </p>
          
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileImport}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>
          
          <button
            type="button"
            onClick={downloadTemplate}
            className="mt-4 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV-sjabloon
          </button>
          </div>
          {teams.length > 0 && (
            <div className="mt-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-700 font-medium">
                  {teams.length} team(s) geïmporteerd. Klik op "Verder" om door te gaan.
                </p>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={onBack}
                  className="px-8 py-4 bg-gray-200 text-gray-700 text-lg font-bold rounded-lg hover:bg-gray-300 focus:ring-4 focus:ring-gray-200 transition-all mr-4"
                >
                  Terug
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                  disabled={isLoading}
                  className="px-8 py-4 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Opslaan..." : "Onboarding afronden"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {importMode === "manual" && teams.length > 0 && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-2 text-blue-700 font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tips voor het invoeren van teams
            </button>
            {showHelp && (
              <div className="mt-3 text-gray-700 text-lg leading-relaxed">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Teamnaam</strong> is verplicht (bijv. "Heren 1", "Dames 2")</li>
                  <li><strong>Captain</strong> is optioneel: de contactpersoon voor dit team</li>
                  <li><strong>E-mail</strong> is optioneel: wordt gebruikt voor wedstrijdupdates</li>
                  <li><strong>Speelklasse</strong> is optioneel: bijv. "Heren 1", "Dames A" of "Gemengd"</li>
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
            {teams.map((team, index) => (
              <div key={index} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">Team {index + 1}</h3>
                  {teams.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTeam(index)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Verwijderen
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-2">
                      Teamnaam <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={team.naam}
                      onChange={(e) => updateTeam(index, "naam", e.target.value)}
                      className={`w-full p-4 text-lg border-2 rounded-lg transition-colors ${
                        errors[`team_${index}`] 
                          ? "border-red-400 bg-red-50" 
                          : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      }`}
                      placeholder="Bijv. Heren 1"
                    />
                    {errors[`team_${index}`] && (
                      <p className="mt-2 text-lg text-red-600 font-medium">{errors[`team_${index}`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-2">
                      Speelklasse
                    </label>
                    <input
                      type="text"
                      value={team.speelklasse || ""}
                      onChange={(e) => updateTeam(index, "speelklasse", e.target.value)}
                      className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                      placeholder="Bijv. Heren 1e klasse"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-2">
                      Captain naam
                    </label>
                    <input
                      type="text"
                      value={team.captain_naam || ""}
                      onChange={(e) => updateTeam(index, "captain_naam", e.target.value)}
                      className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                      placeholder="Naam van de captain"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-2">
                      Captain e-mail
                    </label>
                    <input
                      type="email"
                      value={team.captain_email || ""}
                      onChange={(e) => updateTeam(index, "captain_email", e.target.value)}
                      className={`w-full p-4 text-lg border-2 rounded-lg transition-colors ${
                        errors[`team_${index}_email`] 
                          ? "border-red-400 bg-red-50" 
                          : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      }`}
                      placeholder="email@example.com"
                    />
                    {errors[`team_${index}_email`] && (
                      <p className="mt-2 text-lg text-red-600 font-medium">{errors[`team_${index}_email`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addTeam}
              className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-600 font-semibold rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + Nog een team toevoegen
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
                className="px-8 py-4 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Opslaan..." : "Onboarding afronden"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}