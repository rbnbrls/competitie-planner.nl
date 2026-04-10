import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { paymentApi } from "../../lib/api";
import { 
  BarChart3, 
  Settings, 
  Palette, 
  LayoutDashboard, 
  Trophy, 
  Calendar, 
  Users, 
  CreditCard,
  Target,
  LogOut,
  Layers
} from "lucide-react";

export default function TenantLayout() {
  const { club, logout } = useAuth();
  const location = useLocation();

  const { data: paymentStatus } = useQuery({
    queryKey: ["paymentStatus"],
    queryFn: async () => {
      const res = await paymentApi.getCheckoutStatus();
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const isDevMode = import.meta.env.DEV;
  const hasAccess = isDevMode || (paymentStatus?.is_sponsored) || (paymentStatus?.has_active_mandate && paymentStatus?.paid_competitions && paymentStatus.paid_competitions.length > 0);

  const parts = location.pathname.split("/");
  let competitieId = null;
  if (parts[1] === "ronde" && parts.length >= 4) {
    competitieId = parts[3];
  } else if (["teams", "rondes", "historie", "seizoensoverzicht", "wedstrijden"].includes(parts[1]) && parts.length >= 3) {
    competitieId = parts[2];
  }

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/competities", label: "Competities", icon: Trophy },
    ...(competitieId ? [
      { path: `/seizoensoverzicht/${competitieId}`, label: "Seizoen", icon: BarChart3 },
      { path: `/rondes/${competitieId}`, label: "Planning", icon: Calendar },
    ] : []),
    { path: "/dagoverzicht", label: "Dagoverzicht", icon: Target },
    { path: "/instellingen", label: "Instellingen", icon: Settings },
    { path: "/branding", label: "Huisstijl", icon: Palette },
    { path: "/banen", label: "Banen", icon: Layers },
    { path: "/gebruikers", label: "Gebruikers", icon: Users },
    { path: "/checkout", label: "Betalingen", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row pb-16 md:pb-0 overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 sticky top-0 h-screen z-40 shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-gray-50">
           <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center p-2 shadow-lg shadow-blue-100">
             {club?.logo_url ? (
               <img src={club.logo_url} alt="Logo" className="h-full w-full object-contain filter invert brightness-0 invert" />
             ) : (
               <div className="text-white font-black text-xl">A</div>
             )}
           </div>
            <div>
               <h2 className="text-sm font-black text-gray-900 leading-tight truncate w-36">
                  {club?.naam || "Vereniging"}
               </h2>
               <div className="flex items-center gap-1.5 mt-0.5">
                  {hasAccess ? (
                    <>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Systeem Actief</span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Betaling Required</span>
                    </>
                  )}
               </div>
            </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path.split('/').slice(0, 2).join('/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-100 ring-2 ring-blue-100"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Icon size={18} className={isActive ? "text-blue-100" : "text-gray-400 group-hover:text-blue-600 transition-colors"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-50">
           <button
             onClick={logout}
             className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all group"
           >
             <LogOut size={18} className="text-red-300 group-hover:text-red-500" />
             Uitloggen
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile Header */}
          <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md bg-white/80">
             <div className="flex items-center gap-3">
               <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center p-1.5">
                 <div className="w-full h-full bg-white rounded-[2px]" />
               </div>
               <span className="font-black text-gray-900 tracking-tight">{club?.naam || "App"}</span>
             </div>
             <button onClick={logout} className="p-2 text-gray-400">
                <LogOut size={20} />
             </button>
          </header>

          <main className="flex-1 w-full p-4 md:p-8 lg:p-12 overflow-y-auto">
            <Outlet />
          </main>
      </div>

      {/* Mobile Bottom Navigation - More premium feel */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex overflow-x-auto z-50 p-2 gap-1 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path.split('/').slice(0, 2).join('/'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center min-w-[70px] py-1.5 rounded-xl transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                  : "text-gray-400"
              }`}
            >
              <Icon size={20} className={isActive ? "text-white" : "text-gray-400"} />
              <span className="text-[10px] font-black uppercase mt-1 tracking-tighter">{item.label}</span>
            </Link>
          );
        })}
        {/* Toggle butten for 'More' could be added here if many items */}
      </nav>
    </div>
  );
}