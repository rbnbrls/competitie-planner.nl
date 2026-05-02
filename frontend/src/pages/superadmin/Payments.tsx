/*
 * File: frontend/src/pages/superadmin/Payments.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useEffect, useState } from "react";
import { superadminApi, ApiError } from "../../lib/api";

const COMPETITIONS = [
  "Voorjaarscompetitie",
  "Zomeravondcompetitie",
  "Najaarscompetitie",
  "Wintercompetitie",
  "8&9 Tennis",
];

interface Price {
  id: string;
  competitie_naam: string;
  price_small_club: number;
  price_large_club: number;
}

interface Mandate {
  id: string;
  club_id: string;
  club_name: string;
  mollie_mandate_id: string;
  mandate_reference: string;
  consumer_name: string;
  iban: string;
  status: string;
  signed_at: string | null;
  created_at: string;
  payments: Array<{
    id: string;
    competitie_naam: string;
    amount: number;
    status: string;
    paid_at: string | null;
  }>;
}

export default function PaymentsPage() {
  const [config, setConfig] = useState<{ configured: boolean; api_key: string | null }>({
    configured: false,
    api_key: null,
  });
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [prices, setPrices] = useState<Price[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState(COMPETITIONS[0]);
  const [priceSmall, setPriceSmall] = useState("");
  const [priceLarge, setPriceLarge] = useState("");
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [activeTab, setActiveTab] = useState<"config" | "prices" | "mandates">("config");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const configRes = await superadminApi.getMollieConfig();
      setConfig(configRes.data);

      const pricesRes = await superadminApi.listPrices();
      setPrices(pricesRes.data.prices || []);

      const mandatesRes = await superadminApi.listMandates();
      setMandates(mandatesRes.data.mandates || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await superadminApi.saveMollieConfig(apiKeyInput);
      setMessage({ type: "success", text: "Mollie configuratie opgeslagen" });
      loadData();
    } catch (err: unknown) {
      const error = err instanceof ApiError ? err : null;
      setMessage({ type: "error", text: error?.data?.detail || "Configuratie opslaan mislukt" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await superadminApi.savePrice({
        competitie_naam: selectedCompetition,
        price_small_club: parseInt(priceSmall) * 100,
        price_large_club: parseInt(priceLarge) * 100,
      });
      setMessage({ type: "success", text: "Prijs opgeslagen" });
      loadData();
    } catch (err: unknown) {
      const error = err instanceof ApiError ? err : null;
      setMessage({ type: "error", text: error?.data?.detail || "Prijs opslaan mislukt" });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      active: "bg-green-100 text-green-800",
      revoked: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",
    };
    const statusLabels: Record<string, string> = {
      pending: "In afwachting",
      active: "Actief",
      revoked: "Ingetrokken",
      expired: "Verlopen",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || statusStyles.pending}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Betalingen & Mollie</h1>
        <p className="text-gray-600">Configureer betalingen en beheer SEPA machtigingen</p>
      </div>

      <div className="mb-6">
        <div className="flex space-x-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("config")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === "config"
                ? "bg-white border-x border-t border-gray-200 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Mollie Configuratie
          </button>
          <button
            onClick={() => setActiveTab("prices")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === "prices"
                ? "bg-white border-x border-t border-gray-200 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Prijzen per Competitie
          </button>
          <button
            onClick={() => setActiveTab("mandates")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === "mandates"
                ? "bg-white border-x border-t border-gray-200 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Machtigingen ({mandates.length})
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </div>
      )}

      {activeTab === "config" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Mollie API Configuratie</h2>
          <p className="text-sm text-gray-600 mb-4">
            Voer je Mollie API key in om betalingen te accepteren. De key begint met "live_".
          </p>
          {config.configured && (
            <p className="text-sm text-green-600 mb-4">
              Momenteel geconfigureerd met: {config.api_key}
            </p>
          )}
          <form onSubmit={handleSaveConfig}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mollie API Key</label>
              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="live_..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSaving || !apiKeyInput}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Opslaan..." : "Opslaan"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "prices" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Prijzen per Competitie</h2>
          <p className="text-sm text-gray-600 mb-4">
            Stel de prijs in voor elke competitie. Verenigingen met minder dan 7 banen betalen het kleine tarief, verenigingen met 7 of meer banen betalen het grote tarief.
          </p>
          <form onSubmit={handleSavePrice} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Competitie</label>
                <select
                  value={selectedCompetition}
                  onChange={(e) => setSelectedCompetition(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {COMPETITIONS.map((comp) => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prijs &lt;7 banen (&euro;)</label>
                <input
                  type="number"
                  value={priceSmall}
                  onChange={(e) => setPriceSmall(e.target.value)}
                  placeholder="25.00"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prijs &ge;7 banen (&euro;)</label>
                <input
                  type="number"
                  value={priceLarge}
                  onChange={(e) => setPriceLarge(e.target.value)}
                  placeholder="50.00"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSaving || !priceSmall || !priceLarge}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Opslaan..." : "Prijs opslaan"}
            </button>
          </form>

          <h3 className="text-md font-semibold mt-6 mb-3">Huidige prijzen</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competitie</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klein tarief (&lt;7 banen)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Groot tarief (&ge;7 banen)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {prices.map((price) => (
                  <tr key={price.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{price.competitie_naam}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">&euro;{(price.price_small_club / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">&euro;{(price.price_large_club / 100).toFixed(2)}</td>
                  </tr>
                ))}
                {prices.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm text-gray-500 text-center">
                      Geen prijzen geconfigureerd
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "mandates" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Machtigingen & Betalingen</h2>
          <p className="text-sm text-gray-600 mb-4">
            Overzicht van alle SEPA machtigingen en betalingen per vereniging.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vereniging</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IBAN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ondertekend op</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Betalingen</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mandates.map((mandate) => (
                  <tr key={mandate.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{mandate.club_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">{mandate.iban}</td>
                    <td className="px-4 py-3">{getStatusBadge(mandate.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {mandate.signed_at ? new Date(mandate.signed_at).toLocaleDateString("nl-NL") : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="space-y-1">
                        {mandate.payments.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between">
                            <span>{payment.competitie_naam}</span>
                            <span className="ml-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                payment.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                              }`}>
                                &euro;{(payment.amount / 100).toFixed(2)} - {payment.status === "paid" ? "Betaald" : "Open"}
                              </span>
                            </span>
                          </div>
                        ))}
                        {mandate.payments.length === 0 && (
                          <span className="text-gray-500">Geen betalingen</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {mandates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-sm text-gray-500 text-center">
                      Geen machtigingen
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}