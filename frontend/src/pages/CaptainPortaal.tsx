import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  MessageCircle, 
  Trophy,
  ChevronRight,
  Info,
  Send
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

interface DisplayClub {
  naam: string;
  slug: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
}

interface CaptainWedstrijd {
  id: string;
  datum: string;
  tijd: string | null;
  is_thuis: boolean;
  tegenstander: string;
  baan_nummer: number | null;
  baan_naam: string | null;
  status: string;
  uitslag_thuisteam: number | null;
  uitslag_uitteam: number | null;
}

interface Beschikbaarheid {
  id: string;
  ronde_id: string;
  is_beschikbaar: boolean;
  notitie: string | null;
}

interface CaptainPortalData {
  team_naam: string;
  competitie_naam: string;
  club: DisplayClub;
  volgende_wedstrijd: CaptainWedstrijd | null;
  alle_wedstrijden: CaptainWedstrijd[];
  beschikbaarheden: Beschikbaarheid[];
}

export default function CaptainPortaal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<CaptainPortalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'planning' | 'uitslagen'>('planning');

  const fetchData = async () => {
    try {
      const res = await axios.get<CaptainPortalData>(`${API_BASE_URL}/captain/${token}`);
      setData(res.data);
    } catch (err) {
      setError("Kon gegevens niet laden. Is de link correct?");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleToggleBeschikbaarheid = async (rondeId: string, current: boolean) => {
    try {
      await axios.post(`${API_BASE_URL}/captain/${token}/beschikbaarheid`, {
        ronde_id: rondeId,
        is_beschikbaar: !current
      });
      fetchData(); // Refresh
    } catch (err) {
      alert("Fout bij het opslaan van beschikbaarheid");
    }
  };

  const handleSubmitResult = async (wedstrijdId: string, th: number, uit: number) => {
    setIsSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/captain/${token}/uitslag`, {
        wedstrijd_id: wedstrijdId,
        uitslag_thuisteam: th,
        uitslag_uitteam: uit
      });
      fetchData();
    } catch (err) {
      alert("Fout bij het opslaan van uitslag");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Toegang geweigerd</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  const { club, team_naam, competitie_naam, volgende_wedstrijd, alle_wedstrijden, beschikbaarheden } = data;

  const generateWhatsAppLink = (w: CaptainWedstrijd) => {
    const datum = new Date(w.datum).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
    const text = `Hoi team! 👋\n\nOnze volgende wedstrijd:\n🗓️ ${datum}\n⏰ ${w.tijd?.slice(0, 5) || 'Tijd volgt'}\n📍 ${w.is_thuis ? 'THUIS' : 'UIT'} vs ${w.tegenstander}\n🎾 ${w.is_thuis && w.baan_nummer ? `Baan ${w.baan_nummer}` : ''}\n\nKunnen jullie allemaal?`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header 
        className="text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${club.primary_color}, ${club.primary_color}dd)` }}
      >
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-6">
            {club.logo_url && (
              <div className="bg-white p-2 rounded-xl shadow-md">
                <img src={club.logo_url} alt="Logo" className="h-16 w-16 object-contain" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">{team_naam}</h1>
              <p className="text-indigo-100 font-medium">
                {competitie_naam} • {club.naam}
              </p>
            </div>
            <a 
              href={generateWhatsAppLink(volgende_wedstrijd || alle_wedstrijden[0])}
              target="_blank"
              rel="noreferrer"
              className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full transition-transform hover:scale-110 shadow-lg"
              title="Deel volgende wedstrijd op WhatsApp"
            >
              <MessageCircle size={24} />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 -mt-6">
        {/* Volgende Wedstrijd Card */}
        {volgende_wedstrijd && (
          <section className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8 border border-slate-100">
            <div className="bg-slate-900 px-6 py-3 flex items-center justify-between">
              <span className="text-indigo-400 font-bold text-sm tracking-wider uppercase">Eerstvolgende wedstrijd</span>
              <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded-md">LIVE</span>
            </div>
            <div className="p-8 flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500 mb-2">
                  <Calendar size={18} />
                  <span className="font-medium">
                    {new Date(volgende_wedstrijd.datum).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-4 uppercase tracking-tight">
                  <span className="text-slate-400">VS</span> {volgende_wedstrijd.tegenstander}
                </h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <div className="bg-slate-100 px-4 py-2 rounded-2xl flex items-center gap-2">
                    <Clock size={18} className="text-indigo-600" />
                    <span className="font-bold text-slate-700">{volgende_wedstrijd.tijd?.slice(0, 5) || "N.v.t."}</span>
                  </div>
                  <div className="bg-slate-100 px-4 py-2 rounded-2xl flex items-center gap-2">
                    <MapPin size={18} className="text-indigo-600" />
                    <span className="font-bold text-slate-700">
                      {volgende_wedstrijd.is_thuis ? `Thuis - Baan ${volgende_wedstrijd.baan_nummer || '?'}` : 'Uitwedstrijd'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2 text-center">Status</p>
                <div className="text-center">
                   {volgende_wedstrijd.status === 'gepubliceerd' ? (
                     <span className="text-green-600 font-black text-xl flex items-center gap-2">
                       <CheckCircle2 /> DEFINITIEF
                     </span>
                   ) : (
                     <span className="text-amber-500 font-black text-xl flex items-center gap-2">
                       <Info /> CONCEPT
                     </span>
                   )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button 
            onClick={() => setActiveTab('planning')}
            className={`px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'planning' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            Planning & Beschikbaarheid
          </button>
          <button 
            onClick={() => setActiveTab('uitslagen')}
            className={`px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'uitslagen' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            Uitslagen doorgeven
          </button>
        </div>

        {/* Content Tabs */}
        <div className="space-y-4">
          {activeTab === 'planning' ? (
            <>
              {alle_wedstrijden.map((w) => {
                const beschik = beschikbaarheden.find(b => b.ronde_id === w.id);
                return (
                  <div key={w.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="text-center min-w-[80px]">
                        <div className="text-sm font-bold text-slate-400 uppercase">{new Date(w.datum).toLocaleDateString('nl-NL', { month: 'short' })}</div>
                        <div className="text-3xl font-black text-slate-900">{new Date(w.datum).getDate()}</div>
                      </div>
                      
                      <div className="flex-1 text-center md:text-left">
                        <div className="text-slate-400 text-xs font-bold uppercase mb-1">
                          {w.is_thuis ? 'Thuiswedstrijd' : 'Uitwedstrijd'}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">vs {w.tegenstander}</h3>
                        <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 mt-2 text-slate-500 text-sm">
                          <span className="flex items-center gap-1"><Clock size={14} /> {w.tijd?.slice(0, 5) || '--:--'}</span>
                          <span className="flex items-center gap-1"><MapPin size={14} /> {w.is_thuis ? (w.baan_nummer ? `Baan ${w.baan_nummer}` : 'Baan volgt') : 'Locatie tegenstander'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                         <div className="text-right hidden md:block">
                            <p className="text-xs font-bold text-slate-400 uppercase">Beschikbaar?</p>
                            <p className="text-sm font-medium">{beschik?.is_beschikbaar === false ? 'Nee' : 'Ja'}</p>
                         </div>
                         <button 
                           onClick={() => handleToggleBeschikbaarheid(w.id, beschik?.is_beschikbaar ?? true)}
                           className={`p-3 rounded-xl transition-all ${beschik?.is_beschikbaar === false ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} hover:scale-105`}
                         >
                           {beschik?.is_beschikbaar === false ? <XCircle size={24} /> : <CheckCircle2 size={24} />}
                         </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">Datum</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">Wedstrijd</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">Uitslag</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase">Actie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alle_wedstrijden.filter(w => new Date(w.datum) <= new Date()).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                        Geen recente wedstrijden om uitslagen voor door te geven.
                      </td>
                    </tr>
                  ) : (
                    alle_wedstrijden.filter(w => new Date(w.datum) <= new Date()).map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{new Date(w.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">vs {w.tegenstander}</div>
                          <div className="text-xs text-slate-400 uppercase font-bold">{w.is_thuis ? 'Thuis' : 'Uit'}</div>
                        </td>
                        <td className="px-6 py-4">
                          {w.uitslag_thuisteam !== null ? (
                            <div className="flex items-center gap-2">
                              <Trophy size={16} className="text-amber-500" />
                              <span className="font-black text-lg text-slate-900">{w.uitslag_thuisteam} - {w.uitslag_uitteam}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-sm">Nog niet ingevuld</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              const res = prompt("Voer uitslag in (bijv. 4-2):");
                              if (res) {
                                const [th, uit] = res.split('-').map(Number);
                                if (!isNaN(th) && !isNaN(uit)) {
                                  handleSubmitResult(w.id, th, uit);
                                } else {
                                  alert("Ongeldig formaat. Gebruik bijv. 4-2");
                                }
                              }
                            }}
                            className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ml-auto"
                          >
                            <Send size={14} /> {w.uitslag_thuisteam !== null ? 'Wijzigen' : 'Ingeven'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer info */}
      <footer className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} {club.naam} • Powered by competitie-planner.nl</p>
      </footer>
    </div>
  );
}
