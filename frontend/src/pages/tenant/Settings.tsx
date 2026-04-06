import { useState, useEffect } from "react";
import { tenantApi } from "../../lib/api";

interface ClubSettings {
  id: string;
  naam: string;
  slug: string;
  adres: string | null;
  postcode: string | null;
  stad: string | null;
  telefoon: string | null;
  website: string | null;
  status: string;
  max_thuisteams_per_dag: number;
  max_banen: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    naam: "",
    adres: "",
    postcode: "",
    stad: "",
    telefoon: "",
    website: "",
    max_thuisteams_per_dag: 3,
    max_banen: 8,
  });

  useEffect(() => {
    tenantApi.getSettings().then((res) => {
      setSettings(res.data);
      setFormData({
        naam: res.data.naam || "",
        adres: res.data.adres || "",
        postcode: res.data.postcode || "",
        stad: res.data.stad || "",
        telefoon: res.data.telefoon || "",
        website: res.data.website || "",
        max_thuisteams_per_dag: res.data.max_thuisteams_per_dag || 3,
        max_banen: res.data.max_banen || 8,
      });
    }).finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      await tenantApi.updateSettings(formData);
      setMessage("Instellingen opgeslagen");
    } catch (err) {
      setMessage("Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-4">Laden...</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Verenigingsinstellingen</h1>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes("Fout") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verenigingsnaam
            </label>
            <input
              type="text"
              value={formData.naam}
              onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subdomein (URL)
            </label>
            <input
              type="text"
              value={settings?.slug || ""}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Dit kan niet gewijzigd worden
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adres
            </label>
            <input
              type="text"
              value={formData.adres}
              onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postcode
              </label>
              <input
                type="text"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stad
              </label>
              <input
                type="text"
                value={formData.stad}
                onChange={(e) => setFormData({ ...formData, stad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefoon
            </label>
            <input
              type="tel"
              value={formData.telefoon}
              onChange={(e) => setFormData({ ...formData, telefoon: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="https://example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max. thuisteams per dag
              </label>
              <input
                type="number"
                value={formData.max_thuisteams_per_dag}
                onChange={(e) => setFormData({ ...formData, max_thuisteams_per_dag: parseInt(e.target.value) || 3 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
                max="10"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum aantal thuiswedstrijden op één dag
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aantal banen
              </label>
              <input
                type="number"
                value={formData.max_banen}
                onChange={(e) => setFormData({ ...formData, max_banen: parseInt(e.target.value) || 8 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
                max="20"
              />
              <p className="text-xs text-gray-500 mt-1">
                Totaal beschikbare banen
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
      </form>
    </div>
  );
}