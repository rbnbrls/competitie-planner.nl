/*
 * File: frontend/src/pages/tenant/Branding.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useState, useEffect } from "react";
import { tenantApi } from "../../lib/api";
import { Palette, Upload, CheckCircle2, Type, Eye, Trash2 } from "lucide-react";
import { showToast } from "../../components/Toast";
import { 
  Button, 
  Badge, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  LoadingSkeleton,
  Select
} from "../../components";

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
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    tenantApi.getBranding().then((res) => {
      setBranding(res.data);
    }).catch(() => {
      showToast.error("Fout bij laden van huisstijl");
    }).finally(() => setIsLoading(false));
  }, []);

  const handleColorChange = (field: keyof Branding, value: string) => {
    setBranding(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setIsSaving(true);
    try {
      const res = await tenantApi.uploadLogo(logoFile);
      setBranding(prev => ({ ...prev, logo_url: res.data.logo_url }));
      showToast.success("Logo succesvol geüpload");
      setLogoFile(null);
    } catch {
      showToast.error("Fout bij uploaden van logo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await tenantApi.updateBranding({
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        accent_color: branding.accent_color,
        font_choice: branding.font_choice,
      });
      
      // Dynamic update of CSS variables if supported globally
      document.documentElement.style.setProperty("--color-primary", branding.primary_color);
      document.documentElement.style.setProperty("--color-secondary", branding.secondary_color);
      document.documentElement.style.setProperty("--color-accent", branding.accent_color);
      
      showToast.success("Huisstijl succesvol opgeslagen");
    } catch {
      showToast.error("Fout bij opslaan van huisstijl");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton rows={8} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 border-none p-0 flex items-center gap-3">
             <Palette className="text-blue-600" />
             Huisstijl & Branding
          </h1>
          <p className="text-gray-500 font-medium">Pas de uitstraling van je vereniging aan voor e-mails en de publieke display.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Logo Section */}
          <Card className="border-none shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <CardHeader className="bg-gray-50/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload size={18} className="text-blue-600" />
                Logo & Icoon
              </CardTitle>
              <CardDescription>
                Dit logo wordt getoond bovenaan het menu en in de header van de publieke display.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-8">
                 <div className="relative group">
                    <div className="h-32 w-32 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden p-4 group-hover:border-blue-300 transition-colors">
                      {branding.logo_url ? (
                        <img src={branding.logo_url} alt="Huidig Logo" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <Palette size={40} className="text-gray-200" />
                      )}
                    </div>
                    {branding.logo_url && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute -top-2 -right-2 bg-white shadow-md text-red-500 hover:bg-red-50 h-8 w-8 rounded-full"
                          onClick={() => setBranding(prev => ({...prev, logo_url: null}))}
                        >
                          <Trash2 size={14} />
                        </Button>
                    )}
                 </div>

                 <div className="flex-1 space-y-4 w-full">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Bestand kiezen</p>
                      <input
                        type="file"
                        id="logo-upload"
                        accept=".png,.svg,.jpg"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label 
                        htmlFor="logo-upload" 
                        className="flex items-center justify-center w-full px-4 h-12 rounded-xl border-2 border-dashed border-gray-200 text-sm font-bold text-gray-600 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all"
                      >
                        {logoFile ? logoFile.name : "Klik om PNG or SVG te uploaden"}
                      </label>
                    </div>
                    {logoFile && (
                      <Button 
                        onClick={handleLogoUpload} 
                        isLoading={isSaving} 
                        className="w-full h-11"
                      >
                        Uploaden & Opslaan
                      </Button>
                    )}
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* Colors Section */}
          <Card className="border-none shadow-sm ring-1 ring-gray-100 overflow-hidden">
             <CardHeader className="bg-gray-50/50 text-gray-900">
                <CardTitle className="text-lg flex items-center gap-2">
                   <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500" />
                   Kleurenpalet
                </CardTitle>
                <CardDescription>Selecteer de kleuren van je vereniging voor een consistente uitstraling.</CardDescription>
             </CardHeader>
             <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Primaire kleur</label>
                      <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-100">
                         <input
                           type="color"
                           value={branding.primary_color}
                           onChange={(e) => handleColorChange("primary_color", e.target.value)}
                           className="h-10 w-10 min-h-[40px] rounded-lg border-none bg-transparent cursor-pointer"
                         />
                         <input
                           type="text"
                           value={branding.primary_color}
                           onChange={(e) => handleColorChange("primary_color", e.target.value)}
                           className="flex-1 bg-transparent text-sm font-bold text-gray-600 outline-none"
                         />
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium pl-1 italic">Gebruikt voor de sidebar en knoppen.</p>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Secundaire kleur</label>
                      <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-100">
                         <input
                           type="color"
                           value={branding.secondary_color}
                           onChange={(e) => handleColorChange("secondary_color", e.target.value)}
                           className="h-10 w-10 min-h-[40px] rounded-lg border-none bg-transparent cursor-pointer"
                         />
                         <input
                           type="text"
                           value={branding.secondary_color}
                           onChange={(e) => handleColorChange("secondary_color", e.target.value)}
                           className="flex-1 bg-transparent text-sm font-bold text-gray-600 outline-none"
                         />
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium pl-1 italic">Tekstkleur op de primaire achtergrond.</p>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Accentkleur</label>
                      <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-100">
                         <input
                           type="color"
                           value={branding.accent_color}
                           onChange={(e) => handleColorChange("accent_color", e.target.value)}
                           className="h-10 w-10 min-h-[40px] rounded-lg border-none bg-transparent cursor-pointer"
                         />
                         <input
                           type="text"
                           value={branding.accent_color}
                           onChange={(e) => handleColorChange("accent_color", e.target.value)}
                           className="flex-1 bg-transparent text-sm font-bold text-gray-600 outline-none"
                         />
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium pl-1 italic">Badges, statussen en highlights.</p>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="border-none shadow-sm ring-1 ring-gray-100 overflow-hidden">
             <CardHeader className="bg-gray-50/50">
               <CardTitle className="text-lg flex items-center gap-2">
                 <Type size={18} className="text-blue-600" />
                 Lidmaatschap Tipografie
               </CardTitle>
             </CardHeader>
             <CardContent className="p-6">
                <Select
                  label="Lettertype familie"
                  value={branding.font_choice}
                  onChange={(e) => setBranding(prev => ({ ...prev, font_choice: e.target.value }))}
                  options={[
                    { value: "default", label: "Inter (Systeem standaard)" },
                    { value: "modern", label: "Montserrat (Modern & Open)" },
                    { value: "classic", label: "Roboto Serif (Klassiek & Zakelijk)" },
                  ]}
                />
             </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-xl shadow-gray-200/50 sticky top-8 ring-2 ring-blue-600 overflow-hidden">
             <CardHeader className="bg-blue-600 text-white pb-8">
               <CardTitle className="text-lg flex items-center gap-2">
                 <Eye size={18} />
                 Live Preview
               </CardTitle>
               <CardDescription className="text-blue-100">Zo ziet je display eruit.</CardDescription>
             </CardHeader>
             <div className="p-1 -mt-4">
                <div 
                  className="rounded-2xl border-4 border-white shadow-2xl min-h-[300px] overflow-hidden flex flex-col"
                  style={{ backgroundColor: branding.primary_color }}
                >
                   {/* Mock Header */}
                   <div className="p-4 flex items-center justify-between border-b border-white/10" style={{ color: branding.secondary_color }}>
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center p-1.5 font-black">
                           {branding.logo_url ? <img src={branding.logo_url} className="h-full w-full object-contain" /> : "V"}
                         </div>
                         <span className="font-black text-sm">TV De Merel</span>
                      </div>
                      <Badge style={{ backgroundColor: branding.accent_color, color: '#000' }} className="border-none shadow-md">RONDE 5</Badge>
                   </div>
                   
                   {/* Mock Body */}
                   <div className="p-6 flex-1 space-y-4">
                      <div className="h-12 w-full bg-white/10 rounded-xl p-3 flex items-center justify-between" style={{ color: branding.secondary_color }}>
                         <span className="font-bold text-xs opacity-70">BAAN 1</span>
                         <span className="font-black">Team Jan Jansen</span>
                      </div>
                      <div className="h-12 w-full bg-white/10 rounded-xl p-3 flex items-center justify-between" style={{ color: branding.secondary_color }}>
                         <span className="font-bold text-xs opacity-70">BAAN 2</span>
                         <span className="font-black">Team De Vries</span>
                      </div>
                      
                      <div className="mt-auto pt-6 flex justify-center">
                         <Button 
                           variant="secondary" 
                           className="shadow-lg h-9 border-none font-black text-xs uppercase" 
                           style={{ backgroundColor: branding.secondary_color, color: branding.primary_color }}
                        >
                           Verderlezen
                         </Button>
                      </div>
                   </div>
                </div>
             </div>
             <CardContent className="p-6 bg-white">
                <Button onClick={handleSave} isLoading={isSaving} className="w-full h-12 shadow-md shadow-blue-100 gap-2">
                   <CheckCircle2 size={18} />
                   Alles Opslaan
                </Button>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}