import { useState, useEffect } from "react";
import { tenantApi } from "../../lib/api";

interface Branding {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_choice: string;
  logo_url: string | null;
}

export default function BrandingPage() {
  const [branding, setBranding] = useState<Branding>({
    primary_color: "#1B5E20",
    secondary_color: "#FFFFFF",
    accent_color: "#FFC107",
    font_choice: "default",
    logo_url: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    tenantApi.getBranding().then((res) => {
      setBranding(res.data);
    }).finally(() => setIsLoading(false));
  }, []);

  const handleColorChange = (field: keyof Branding, value: string) => {
    setBranding({ ...branding, [field]: value });
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setIsSaving(true);
    try {
      const res = await tenantApi.uploadLogo(logoFile);
      setBranding({ ...branding, logo_url: res.data.logo_url });
      setMessage("Logo opgeslagen");
    } catch {
      setMessage("Fout bij uploaden");
    } finally {
      setIsSaving(false);
      setLogoFile(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    try {
      await tenantApi.updateBranding({
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        accent_color: branding.accent_color,
        font_choice: branding.font_choice,
      });
      
      document.documentElement.style.setProperty("--color-primary", branding.primary_color);
      document.documentElement.style.setProperty("--color-secondary", branding.secondary_color);
      document.documentElement.style.setProperty("--color-accent", branding.accent_color);
      
      setMessage("Huisstijl opgeslagen");
    } catch {
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
      <h1 className="text-2xl font-bold mb-6">Huisstijl</h1>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes("Fout") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {message}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo uploaden (PNG of SVG, max 2MB)
          </label>
          <div className="flex items-center gap-4">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="Logo" className="h-16 w-16 object-contain" />
            )}
            <input
              type="file"
              accept=".png,.svg"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {logoFile && (
              <button
                type="button"
                onClick={handleLogoUpload}
                disabled={isSaving}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Uploaden
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primaire kleur
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.primary_color}
                onChange={(e) => handleColorChange("primary_color", e.target.value)}
                className="h-10 w-10 rounded border"
              />
              <input
                type="text"
                value={branding.primary_color}
                onChange={(e) => handleColorChange("primary_color", e.target.value)}
                className="w-20 px-2 py-1 border rounded text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Sidebar, knoppen</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secundaire kleur
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.secondary_color}
                onChange={(e) => handleColorChange("secondary_color", e.target.value)}
                className="h-10 w-10 rounded border"
              />
              <input
                type="text"
                value={branding.secondary_color}
                onChange={(e) => handleColorChange("secondary_color", e.target.value)}
                className="w-20 px-2 py-1 border rounded text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Tekst op primaire</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Accentkleur
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.accent_color}
                onChange={(e) => handleColorChange("accent_color", e.target.value)}
                className="h-10 w-10 rounded border"
              />
              <input
                type="text"
                value={branding.accent_color}
                onChange={(e) => handleColorChange("accent_color", e.target.value)}
                className="w-20 px-2 py-1 border rounded text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Badges, highlights</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lettertype
          </label>
          <select
            value={branding.font_choice}
            onChange={(e) => setBranding({ ...branding, font_choice: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="default">Systeem standaard</option>
            <option value="modern">Modern (Sans-serif)</option>
            <option value="classic">Klassiek (Serif)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preview
          </label>
          <div 
            className="p-4 rounded-lg border"
            style={{ 
              backgroundColor: branding.primary_color,
              color: branding.secondary_color 
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold">Voorbeeld header</span>
              <span 
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: branding.accent_color }}
              >
                Badge
              </span>
            </div>
            <button
              className="px-3 py-1 rounded text-sm"
              style={{ 
                backgroundColor: branding.secondary_color,
                color: branding.primary_color 
              }}
            >
              Voorbeeld knop
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
    </div>
  );
}