import { useState, useEffect } from "react";
import { tenantApi, onboardingApi } from "../../lib/api";
import { Save, RefreshCw, Building2, MapPin, Globe, Phone, ShieldCheck, AlertCircle, Users, Activity } from "lucide-react";
import { showToast } from "../../components/Toast";
import { 
  Button, 
  Input, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  LoadingSkeleton,
  Badge
} from "../../components";

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
  const [isResetting, setIsResetting] = useState(false);

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

  const displayUrl = `${window.location.origin}/display`;
  const narrowcastingUrl = `${window.location.origin}/narrowcasting`;

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
    }).catch(() => {
      showToast.error("Fout bij laden van instellingen");
    }).finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await tenantApi.updateSettings(formData);
      showToast.success("Instellingen succesvol opgeslagen");
    } catch {
      showToast.error("Fout bij opslaan van instellingen");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetOnboarding = async () => {
    if (!confirm("Weet je zeker dat je de onboarding opnieuw wilt doorlopen? Alle ingestelde gegevens blijven behouden.")) {
      return;
    }
    setIsResetting(true);
    try {
      await onboardingApi.reset();
      showToast.success("Onboarding gereset. Je wordt doorgestuurd...");
      setTimeout(() => {
        window.location.href = "/onboarding";
      }, 1500);
    } catch {
      showToast.error("Fout bij resetten van onboarding");
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton rows={10} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 border-none p-0">Instellingen</h1>
          <p className="text-gray-500 font-medium">Beheer je verenigingsgegevens en algemene configuratie.</p>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant={settings?.status === 'actief' ? 'success' : 'default'} className="px-3 py-1">
             {settings?.status === 'actief' ? 'Club Status: Actief' : 'Club Status: Concept'}
           </Badge>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
             <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
               <Building2 size={20} className="text-blue-600" />
               Clubprofiel
             </h3>
             <p className="text-sm text-gray-500 mt-2 leading-relaxed">
               De basisgegevens van je vereniging. Deze informatie wordt gebruikt in e-mails en op de publieke display.
             </p>
          </div>
          
          <div className="md:col-span-2">
            <Card className="border-none shadow-sm ring-1 ring-gray-100">
              <CardContent className="p-6 space-y-6">
                <Input
                  label="Verenigingsnaam"
                  value={formData.naam}
                  onChange={(e) => setFormData(prev => ({ ...prev, naam: e.target.value }))}
                  required
                  placeholder="Bijv. T.V. De Meppers"
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Display URL (Subdomein)</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-mono text-gray-500 overflow-hidden">
                    <Globe size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">{settings?.slug}.competitie-planner.nl</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium italic pl-1">Deze URL is uniek voor jouw club en kan niet worden gewijzigd.</p>
                </div>

                <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <div>
                    <p className="text-xs font-black text-blue-700 uppercase tracking-widest">Publieke display links</p>
                    <p className="text-xs text-blue-600 mt-1">Gebruik deze links op TV-schermen en narrowcasting. Ze zijn direct klikbaar.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">Display (actuele ronde)</label>
                    <a
                      href={displayUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-mono text-blue-700 hover:bg-blue-50"
                    >
                      <Globe size={14} className="shrink-0" />
                      <span className="truncate">{displayUrl}</span>
                    </a>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">Narrowcasting (alias)</label>
                    <a
                      href={narrowcastingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-mono text-blue-700 hover:bg-blue-50"
                    >
                      <Globe size={14} className="shrink-0" />
                      <span className="truncate">{narrowcastingUrl}</span>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
             <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
               <MapPin size={20} className="text-indigo-600" />
               Contactgegevens
             </h3>
             <p className="text-sm text-gray-500 mt-2 leading-relaxed">
               Zorg dat leden en captains contact kunnen opnemen met het bestuur of de parkbeheerder.
             </p>
          </div>

          <div className="md:col-span-2">
            <Card className="border-none shadow-sm ring-1 ring-gray-100">
              <CardContent className="p-6 space-y-6">
                <Input
                  label="Adres"
                  value={formData.adres}
                  onChange={(e) => setFormData(prev => ({ ...prev, adres: e.target.value }))}
                  placeholder="Straatnaam en nummer"
                  icon={<MapPin size={16} />}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Postcode"
                    value={formData.postcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))}
                    placeholder="1234 AB"
                  />
                  <Input
                    label="Stad"
                    value={formData.stad}
                    onChange={(e) => setFormData(prev => ({ ...prev, stad: e.target.value }))}
                    placeholder="Woonplaats"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Telefoon"
                    type="tel"
                    value={formData.telefoon}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefoon: e.target.value }))}
                    icon={<Phone size={16} />}
                  />
                  <Input
                    label="Website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://www.clubsite.nl"
                    icon={<Globe size={16} />}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
             <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
               <ShieldCheck size={20} className="text-green-600" />
               Planningsregels
             </h3>
             <p className="text-sm text-gray-500 mt-2 leading-relaxed">
               Stel de globale limieten in die het planningsalgoritme gebruikt om conflicten te voorkomen.
             </p>
          </div>

          <div className="md:col-span-2">
            <Card className="border-none shadow-sm ring-1 ring-gray-100">
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div className="space-y-4 p-4 bg-blue-50/30 rounded-xl border border-blue-100/50">
                      <div className="flex items-center gap-2 text-blue-800 font-bold text-xs uppercase tracking-widest">
                         <Users size={14} /> Thuisbezetting
                      </div>
                      <Input
                        type="text"
                        inputMode="numeric"
                        label="Max. thuisteams per dag"
                        value={String(formData.max_thuisteams_per_dag)}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_thuisteams_per_dag: parseInt(e.target.value) || 3 }))}
                        min="1"
                        max="20"
                        helperText="Maximum aantal thuiswedstrijden per competitie-dag."
                      />
                   </div>
                   <div className="space-y-4 p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                      <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs uppercase tracking-widest">
                         <Activity size={14} /> Park Capaciteit
                      </div>
                      <Input
                        type="text"
                        inputMode="numeric"
                        label="Aantal banen"
                        value={String(formData.max_banen)}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_banen: parseInt(e.target.value) || 8 }))}
                        min="1"
                        max="50"
                        helperText="Het totaal aantal fysieke banen dat de club beschikbaar heeft."
                      />
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end pt-4 gap-4 border-t border-gray-100">
          <Button
            type="submit"
            isLoading={isSaving}
            className="gap-2 min-w-[160px] h-12 shadow-md shadow-blue-100"
          >
            <Save size={18} />
            Instellingen Opslaan
          </Button>
        </div>
      </form>

      {/* Advanced / Dangerous section */}
      <div className="space-y-4 pt-12 border-t">
        <h2 className="text-xl font-black text-gray-900 border-none p-0">Geavanceerd</h2>
        <Card className="border-amber-100 bg-amber-50/20">
          <CardHeader>
            <CardTitle className="text-amber-900 flex items-center gap-2">
              <RefreshCw size={18} />
              Onboarding Herstellen
            </CardTitle>
            <CardDescription className="text-amber-700">
              Als je de park-instellingen of teams opnieuw wilt configureren met de visuele wizard, kun je de onboarding resetten.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                   <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                      <AlertCircle size={20} />
                   </div>
                   <div className="text-xs text-amber-700 font-medium max-w-md">
                      Je huidige gegevens blijven behouden, maar je wordt teruggestuurd naar de eerste stappen van de club-configuratie.
                   </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleResetOnboarding}
                  isLoading={isResetting}
                  className="bg-white border-amber-200 text-amber-700 hover:bg-amber-50 whitespace-nowrap"
                >
                  Start Onboarding Opnieuw
                </Button>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}