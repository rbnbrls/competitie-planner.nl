/*
 * File: frontend/src/components/onboarding/TeamsStep.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useState, useRef } from "react";
import { onboardingApi, ApiError } from "../../lib/api";
import { InfoIcon } from "../icons/InfoIcon";

/**
 * Parse a CSV string into an array of rows, each row is an array of fields.
 * RFC 4180 compliant: handles quoted fields, escaped quotes, CRLF/LF.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        i += 2;
      } else if (char === '"') {
        inQuotes = false;
        i++;
      } else {
        field += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        row.push(field);
        field = "";
        i++;
      } else if (char === '\r' && nextChar === '\n') {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i += 2;
      } else if (char === '\n' || char === '\r') {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
      } else {
        field += char;
        i++;
      }
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (inQuotes) {
    throw new Error("Malformed CSV: unterminated quoted field");
  }

  return rows;
}

interface Team {
  naam: string;
  captain_naam?: string;
  captain_email?: string;
  speelklasse?: string;
}

interface CSVRow {
  team: Team;
  errors: string[];
}

interface TeamsStepProps {
  competitieId: string;
  onNext: () => void;
  onBack: () => void;
}

export function TeamsStep({ competitieId, onNext, onBack }: TeamsStepProps) {
  const [teams, setTeams] = useState<Team[]>([
    { naam: "", captain_naam: "", captain_email: "", speelklasse: "" }
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [importMode, setImportMode] = useState<"manual" | "csv">("manual");
  const [csvPreview, setCsvPreview] = useState<CSVRow[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateCSVRows = (rows: Team[]): CSVRow[] => {
    const validated: CSVRow[] = [];
    const namen = new Set<string>();
    
    rows.forEach((row) => {
      const errors: string[] = [];
      const trimmedNaam = row.naam.trim();
      
      if (!trimmedNaam) {
        errors.push("Teamnaam is verplicht");
      } else {
        const lowerNaam = trimmedNaam.toLowerCase();
        if (namen.has(lowerNaam)) {
          errors.push("Teamnaam is dubbel");
        } else {
          namen.add(lowerNaam);
        }
      }
      
      if (row.captain_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.captain_email)) {
        errors.push("Ongeldig e-mailadres");
      }
      
      validated.push({ team: row, errors });
    });
    
    return validated;
  };

  const updateCsvPreviewRow = (index: number, field: keyof Team, value: string) => {
    const updated = [...csvPreview];
    updated[index] = {
      ...updated[index],
      team: { ...updated[index].team, [field]: value }
    };
    setCsvPreview(updated);
  };

  const removeCsvPreviewRow = (index: number) => {
    setCsvPreview(csvPreview.filter((_, i) => i !== index));
  };

  const revalidateCsvPreview = () => {
    const teams = csvPreview.map(r => r.team);
    setCsvPreview(validateCSVRows(teams));
  };

  const commitValidCsvRows = () => {
    const validTeams = csvPreview.filter(r => r.errors.length === 0 && r.team.naam.trim()).map(r => r.team);
    setTeams(validTeams.length > 0 ? validTeams : teams);
    setCsvPreview([]);
  };

  const clearCsvPreview = () => {
    setCsvPreview([]);
  };

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

  const handleSaveTeams = async () => {
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
      if (error instanceof ApiError && error.data?.detail) {
        setErrors({ algemeen: error.data.detail as string });
      } else {
        setErrors({ algemeen: "Er is iets misgegaan. Probeer het opnieuw." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveTeams();
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

    setIsParsingFile(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length < 2) {
        setErrors({ algemeen: "Geen geldige teams gevonden in het bestand" });
        return;
      }

      const headerRow = rows[0].map(h => h.trim().toLowerCase());
      const naamIdx = headerRow.findIndex(h => h === "team_naam" || h === "naam" || h === "team");
      const captainIdx = headerRow.findIndex(h => h === "captain_naam" || h === "captain" || h === "naam_captain");
      const emailIdx = headerRow.findIndex(h => h === "captain_email" || h === "email" || h === "captain_mail");
      const speelklasseIdx = headerRow.findIndex(h => h === "speelklasse" || h === "klasse" || h === "klasse_naam");

      const parsedTeams: Team[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        parsedTeams.push({
          naam: row[naamIdx !== -1 ? naamIdx : 0]?.trim() || "",
          captain_naam: row[captainIdx !== -1 ? captainIdx : 1]?.trim() || "",
          captain_email: row[emailIdx !== -1 ? emailIdx : 2]?.trim() || "",
          speelklasse: row[speelklasseIdx !== -1 ? speelklasseIdx : 3]?.trim() || "",
        });
      }

      if (parsedTeams.length > 0) {
        const validated = validateCSVRows(parsedTeams);
        setCsvPreview(validated);
      } else {
        setErrors({ algemeen: "Geen geldige teams gevonden in het bestand" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error && err.message === "Malformed CSV: unterminated quoted field"
        ? "Ongeldige CSV: een aangehaald veld is niet afgesloten"
        : "Kon het bestand niet lezen. Gebruik een geldige CSV.";
      setErrors({ algemeen: message });
    } finally {
      setIsParsingFile(false);
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
              data-testid="csv-file-input"
              disabled={isParsingFile}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          
          {isParsingFile && (
            <div className="mt-4 flex items-center gap-2 text-blue-700 font-medium">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Importeren...</span>
            </div>
          )}
          
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

          {errors.algemeen && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-lg">
              {errors.algemeen}
            </div>
          )}

          {csvPreview.length > 0 && (
            <div className="mt-6">
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-4">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Importvoorbeelden</h3>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-green-700 font-semibold">
                    ✓ {csvPreview.filter(r => r.errors.length === 0 && r.team.naam.trim()).length} teams geldig
                  </span>
                  {csvPreview.filter(r => r.errors.length > 0 || !r.team.naam.trim()).length > 0 && (
                    <span className="text-red-700 font-semibold">
                      ✗ {csvPreview.filter(r => r.errors.length > 0 || !r.team.naam.trim()).length} fouten
                    </span>
                  )}
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {csvPreview.map((row, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        row.errors.length > 0
                          ? "border-red-300 bg-red-50"
                          : row.team.naam.trim()
                          ? "border-green-300 bg-green-50"
                          : "border-yellow-300 bg-yellow-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-gray-700">
                          Rij {index + 1}: {row.team.naam.trim() || "(geen teamnaam)"}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeCsvPreviewRow(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Verwijderen
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Teamnaam <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={row.team.naam}
                            onChange={(e) => {
                              updateCsvPreviewRow(index, "naam", e.target.value);
                              setTimeout(revalidateCsvPreview, 0);
                            }}
                            className={`w-full p-2 text-sm border rounded ${
                              row.errors.some(e => e.includes("Teamnaam"))
                                ? "border-red-400 bg-red-100"
                                : "border-gray-300"
                            }`}
                            placeholder="Teamnaam"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Captain e-mail
                          </label>
                          <input
                            type="text"
                            value={row.team.captain_email || ""}
                            onChange={(e) => {
                              updateCsvPreviewRow(index, "captain_email", e.target.value);
                              setTimeout(revalidateCsvPreview, 0);
                            }}
                            className={`w-full p-2 text-sm border rounded ${
                              row.errors.some(e => e.includes("e-mailadres"))
                                ? "border-red-400 bg-red-100"
                                : "border-gray-300"
                            }`}
                            placeholder="email@example.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Captain naam
                          </label>
                          <input
                            type="text"
                            value={row.team.captain_naam || ""}
                            onChange={(e) => updateCsvPreviewRow(index, "captain_naam", e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded"
                            placeholder="Naam captain"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Speelklasse
                          </label>
                          <input
                            type="text"
                            value={row.team.speelklasse || ""}
                            onChange={(e) => updateCsvPreviewRow(index, "speelklasse", e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded"
                            placeholder="Speelklasse"
                          />
                        </div>
                      </div>

                      {row.errors.length > 0 && (
                        <div className="mt-3 flex flex-col gap-1">
                          {row.errors.map((error, errIdx) => (
                            <p key={errIdx} className="text-sm text-red-600 font-medium">
                              ⚠ {error}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={commitValidCsvRows}
                    disabled={csvPreview.filter(r => r.errors.length === 0 && r.team.naam.trim()).length === 0}
                    className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Importeer geldige teams ({csvPreview.filter(r => r.errors.length === 0 && r.team.naam.trim()).length})
                  </button>
                  <button
                    type="button"
                    onClick={clearCsvPreview}
                    className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            </div>
          )}

          {teams.length > 0 && csvPreview.length === 0 && (
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
                  onClick={handleSaveTeams}
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
              <InfoIcon />
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
                     <label htmlFor={`team_naam_${index}`} className="block text-lg font-semibold text-gray-700 mb-2">
                       Teamnaam <span className="text-red-500">*</span>
                     </label>
                     <input
                       type="text"
                       id={`team_naam_${index}`}
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
                     <label htmlFor={`team_speelklasse_${index}`} className="block text-lg font-semibold text-gray-700 mb-2">
                       Speelklasse
                     </label>
                     <input
                       type="text"
                       id={`team_speelklasse_${index}`}
                       value={team.speelklasse || ""}
                       onChange={(e) => updateTeam(index, "speelklasse", e.target.value)}
                       className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                       placeholder="Bijv. Heren 1e klasse"
                     />
                   </div>

                   <div>
                     <label htmlFor={`team_captain_naam_${index}`} className="block text-lg font-semibold text-gray-700 mb-2">
                       Captain naam
                     </label>
                     <input
                       type="text"
                       id={`team_captain_naam_${index}`}
                       value={team.captain_naam || ""}
                       onChange={(e) => updateTeam(index, "captain_naam", e.target.value)}
                       className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                       placeholder="Naam van de captain"
                     />
                   </div>

                   <div>
                     <label htmlFor={`team_captain_email_${index}`} className="block text-lg font-semibold text-gray-700 mb-2">
                       Captain e-mail
                     </label>
                     <input
                       type="email"
                       id={`team_captain_email_${index}`}
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