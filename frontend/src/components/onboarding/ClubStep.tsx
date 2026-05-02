/*
 * File: frontend/src/components/onboarding/ClubStep.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useState } from "react";
import { onboardingApi, ApiError } from "../../lib/api";
import { clubSchema, zodErrors } from "../../lib/schemas";

interface ClubStepProps {
  onNext: () => void;
  initialData?: {
    naam?: string;
    adres?: string;
    postcode?: string;
    stad?: string;
    telefoon?: string;
    email?: string;
  };
}

export function ClubStep({ onNext, initialData }: ClubStepProps) {
  const [formData, setFormData] = useState({
    naam: initialData?.naam || "",
    adres: initialData?.adres || "",
    postcode: initialData?.postcode || "",
    stad: initialData?.stad || "",
    telefoon: initialData?.telefoon || "",
    email: initialData?.email || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateField = (field: string, value: string) => {
    const result = clubSchema.safeParse({ ...formData, [field]: value });
    const fieldError = zodErrors(result)[field];
    setErrors((prev) => ({ ...prev, [field]: fieldError || "" }));
  };

  const getFormValues = () => formData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const values = getFormValues();
    const result = clubSchema.safeParse(values);
    const newErrors = zodErrors(result);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      await onboardingApi.saveClub({
        naam: values.naam.trim(),
        adres: values.adres.trim() || undefined,
        postcode: values.postcode.trim() || undefined,
        stad: values.stad.trim() || undefined,
        telefoon: values.telefoon.trim() || undefined,
        email: values.email.trim() || undefined,
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

  const handleChange = (field: string, value: string) => {
    if (field === "telefoon") {
      const digits = value.replace(/[^\d+]/g, "");
      if (digits.startsWith("+31") || digits.startsWith("0")) {
        let formatted = digits;
        if (digits.length > 3) {
          if (digits.startsWith("+31")) {
            if (digits[3] === "6" && digits.length > 4) {
              formatted = `+31 6 ${digits.slice(4, 6)} ${digits.slice(6, 10)}`.trim();
            } else if (digits[3] === "6") {
              formatted = `+31 6 ${digits.slice(4)}`.trim();
            } else {
              formatted = `+31 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`.trim();
            }
          } else if (digits[1] === "6" && digits.length > 4) {
            formatted = `06 ${digits.slice(2, 4)} ${digits.slice(4, 8)}`.trim();
          } else {
            formatted = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`.trim();
          }
        }
        setFormData(prev => ({ ...prev, [field]: formatted }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
        return;
      }
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Stap 1: Club-informatie</h2>
      <p className="text-gray-600 mb-6">
        Vertel ons meer over je tennisvereniging. Deze informatie wordt getoond op je clubpagina.
      </p>

      {errors.algemeen && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-lg">
          {errors.algemeen}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="naam" className="block text-lg font-semibold text-gray-700 mb-2">
            Clubnaam <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="naam"
            value={formData.naam}
            onChange={(e) => handleChange("naam", e.target.value)}
            onBlur={(e) => validateField("naam", e.target.value)}
            className={`w-full p-4 text-lg border-2 rounded-lg transition-colors ${
              errors.naam
                ? "border-red-400 bg-red-50"
                : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            }`}
            placeholder="Bijvoorbeeld: Tennisvereniging example"
          />
          {errors.naam && (
            <p className="mt-2 text-lg text-red-600 font-medium">{errors.naam}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">Dit is de naam die zichtbaar is voor alle gebruikers</p>
        </div>

        <div>
          <label htmlFor="adres" className="block text-lg font-semibold text-gray-700 mb-2">
            Adres
          </label>
          <input
            type="text"
            id="adres"
            value={formData.adres}
            onChange={(e) => handleChange("adres", e.target.value)}
            className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
            placeholder="Straat en huisnummer"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="postcode" className="block text-lg font-semibold text-gray-700 mb-2">
              Postcode
            </label>
            <input
              type="text"
              id="postcode"
              value={formData.postcode}
              onChange={(e) => handleChange("postcode", e.target.value.toUpperCase())}
              onBlur={(e) => validateField("postcode", e.target.value.toUpperCase())}
              className={`w-full p-4 text-lg border-2 rounded-lg transition-colors ${
                errors.postcode
                  ? "border-red-400 bg-red-50"
                  : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              }`}
              placeholder="1234AB"
              maxLength={6}
            />
            {errors.postcode && (
              <p className="mt-2 text-lg text-red-600 font-medium">{errors.postcode}</p>
            )}
          </div>

          <div>
            <label htmlFor="stad" className="block text-lg font-semibold text-gray-700 mb-2">
              Plaats
            </label>
            <input
              type="text"
              id="stad"
              value={formData.stad}
              onChange={(e) => handleChange("stad", e.target.value)}
              className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              placeholder="Amsterdam"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="telefoon" className="block text-lg font-semibold text-gray-700 mb-2">
              Telefoonnummer
            </label>
              <div>
                <input
                  type="tel"
                  id="telefoon"
                  value={formData.telefoon}
                  onChange={(e) => handleChange("telefoon", e.target.value)}
                  onBlur={(e) => validateField("telefoon", e.target.value)}
                  className={`w-full p-4 text-lg border-2 rounded-lg transition-colors ${
                    errors.telefoon
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  }`}
                  placeholder="06-12345678 of +31 6 12345678"
                />
                {errors.telefoon && (
                  <p className="mt-2 text-lg text-red-600 font-medium">{errors.telefoon}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">Formaat: 06-12345678 of +31 6 12345678</p>
              </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-lg font-semibold text-gray-700 mb-2">
              E-mailadres
            </label>
            <div className="relative">
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={(e) => validateField("email", e.target.value)}
                className={`w-full p-4 text-lg border-2 rounded-lg transition-colors ${
                  errors.email
                    ? "border-red-400 bg-red-50"
                    : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                }`}
                placeholder="info@vereniging.nl"
              />
              {errors.email && (
                <p className="mt-2 text-lg text-red-600 font-medium">{errors.email}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
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