import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

interface CalendarRonde {
  id: string;
  datum: string;
  competitie_naam: string;
  is_inhaalronde: boolean;
  public_token: string | null;
}

interface DisplayClub {
  naam: string;
  slug: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
}

interface ClubCalendarResponse {
  club: DisplayClub;
  rondes: CalendarRonde[];
}

export default function ClubCalendarPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<ClubCalendarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get<ClubCalendarResponse>(`${API_BASE_URL}/display/${slug}/kalender`);
        setData(res.data);
      } catch (_err) {
        setError("Kon de club-kalender niet laden");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600 animate-pulse">Laden van kalender...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Oeps!</h1>
          <p className="text-gray-600 mb-6">{error || "Geen data beschikbaar"}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Probeer opnieuw
          </button>
        </div>
      </div>
    );
  }

  const { club, rondes } = data;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="p-6 text-white shadow-lg sticky top-0 z-10" style={{ backgroundColor: club.primary_color }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {club.logo_url && (
              <img 
                src={club.logo_url} 
                alt={`${club.naam} logo`} 
                className="h-14 w-auto drop-shadow-md" 
              />
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{club.naam}</h1>
              <p className="opacity-90 text-sm md:text-base font-medium">Volledig speelschema & banenplanning</p>
            </div>
          </div>
          <Link 
            to={`/${club.slug}`}
            className="hidden md:block bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-sm transition-colors"
          >
            Bekijk Actueel &rarr;
          </Link>
        </div>
      </header>

      <main className="flex-grow max-w-4xl mx-auto w-full p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Alle Speeldagen</h2>
          <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border">
            {rondes.length} rondes gepubliceerd
          </div>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-1">
          {rondes.length === 0 ? (
            <div className="bg-white p-12 rounded-xl shadow-sm text-center border-2 border-dashed border-gray-200">
              <p className="text-gray-400 text-lg">Er zijn nog geen speelrondes gepubliceerd voor dit seizoen.</p>
            </div>
          ) : (
            rondes.map((ronde) => (
              <Link 
                key={ronde.id}
                to={`/${club.slug}/${ronde.public_token}`}
                className="group block bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-all border-l-8 transform hover:-translate-y-1"
                style={{ borderLeftColor: club.accent_color }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-grow">
                    <p className="font-bold text-xl text-gray-900 group-hover:text-blue-600 transition-colors capitalize">
                      {new Date(ronde.datum).toLocaleDateString("nl-NL", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-500 font-medium">
                        {ronde.competitie_naam}
                      </span>
                      {ronde.is_inhaalronde && (
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                          Inhaaldag
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-end mr-2">
                       <span className="text-xs text-gray-400 uppercase font-bold tracking-widest">Detail</span>
                       <span className="text-blue-500 font-bold group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </div>
                    <div className="sm:hidden text-blue-500 text-2xl font-bold group-hover:translate-x-1 transition-transform">
                      &rarr;
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>

      <footer className="bg-white border-t py-8 px-6 mt-12 text-center text-gray-500">
        <p className="text-sm">© {new Date().getFullYear()} {club.naam} - Aangedreven door <strong>competitie-planner.nl</strong></p>
      </footer>
    </div>
  );
}
