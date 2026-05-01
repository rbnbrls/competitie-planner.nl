/*
 * File: frontend/src/pages/tenant/Layout.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useState } from "react";
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
  Layers,
  Menu,
  X
} from "lucide-react";

export default function TenantLayout() {
  const { user, club, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themePreset, setThemePreset] = useState<"base" | "precision-court">(
    (localStorage.getItem("theme_preset") as "base" | "precision-court" | null) ?? "base"
  );

  const handleThemePresetChange = (preset: "base" | "precision-court") => {
    setThemePreset(preset);
    localStorage.setItem("theme_preset", preset);
    document.documentElement.setAttribute("data-theme", preset);
  };

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

  if (!user) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row pb-16 lg:pb-0 overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[var(--theme-nav-bg)] text-[var(--theme-nav-foreground)] border-r border-white/10 sticky top-0 h-screen z-40 shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
           <div className="h-10 w-10 bg-[var(--theme-primary)] rounded-xl flex items-center justify-center p-2 shadow-lg">
             {club?.logo_url ? (
                <img src={club.logo_url} alt="Logo" className="h-full w-full object-contain" />
             ) : (
               <div className="text-white font-black text-xl">A</div>
             )}
           </div>
            <div>
               <h2 className="text-sm font-black text-[var(--theme-nav-foreground)] leading-tight truncate w-36">
                  {club?.naam || "Vereniging"}
               </h2>
               <div className="flex items-center gap-1.5 mt-0.5">
                    {hasAccess ? (
                      <>
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-[var(--theme-nav-foreground)] opacity-70 uppercase tracking-widest">Systeem Actief</span>
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-[var(--theme-nav-foreground)] opacity-70 uppercase tracking-widest">Betaling Required</span>
                      </>
                    )}
               </div>
            </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="mb-4 rounded-xl border border-white/15 bg-white/5 p-2">
            <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-widest text-[var(--theme-nav-foreground)] opacity-70">Thema</p>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => handleThemePresetChange("base")}
                className={`rounded-lg px-2 py-2 text-[11px] font-bold transition ${
                  themePreset === "base"
                    ? "bg-white text-gray-900"
                    : "text-[var(--theme-nav-foreground)] opacity-80 hover:bg-white/10"
                }`}
              >
                Basis
              </button>
              <button
                type="button"
                onClick={() => handleThemePresetChange("precision-court")}
                className={`rounded-lg px-2 py-2 text-[11px] font-bold transition ${
                  themePreset === "precision-court"
                    ? "bg-[var(--theme-accent)] text-[var(--theme-accent-foreground)]"
                    : "text-[var(--theme-nav-foreground)] opacity-80 hover:bg-white/10"
                }`}
              >
                The Precision Court
              </button>
            </div>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path.split('/').slice(0, 2).join('/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? "bg-[var(--theme-primary)] text-white shadow-xl ring-2 ring-white/20"
                    : "text-[var(--theme-nav-foreground)] opacity-70 hover:opacity-100 hover:bg-white/10"
                }`}
              >
                <Icon size={18} className={isActive ? "text-white" : "text-white/60 group-hover:text-white transition-colors"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
           <button
             onClick={logout}
             className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-red-300 hover:bg-red-500/10 transition-all group"
           >
             <LogOut size={18} className="text-red-300 group-hover:text-red-200" />
             Uitloggen
           </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
           <aside className="fixed inset-y-0 left-0 w-64 bg-[var(--theme-nav-bg)] text-[var(--theme-nav-foreground)] z-50 lg:hidden transform transition-transform duration-300 ease-in-out shadow-xl">
            <div className="p-4 flex items-center justify-between border-b border-white/10">
              <h2 className="text-sm font-black text-[var(--theme-nav-foreground)]">Menu</h2>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-white/60 hover:text-white rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path.split('/').slice(0, 2).join('/'));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive
                        ? "bg-[var(--theme-primary)] text-white shadow-lg"
                        : "text-[var(--theme-nav-foreground)] opacity-70 hover:opacity-100 hover:bg-white/10"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "text-white" : "text-white/60 group-hover:text-white"} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-red-300 hover:bg-red-500/10 transition-all group"
              >
                <LogOut size={18} className="text-red-300 group-hover:text-red-200" />
                Uitloggen
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile/Tablet Header */}
          <header className="lg:hidden bg-[var(--theme-nav-bg)] border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
             <div className="flex items-center gap-3">
               <button 
                 onClick={() => setSidebarOpen(true)}
                  className="p-1.5 -ml-1 mr-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Menu size={24} />
                </button>
                <div className="h-8 w-8 bg-[var(--theme-primary)] rounded-lg flex items-center justify-center p-1.5">
                  <div className="w-full h-full bg-white rounded-[2px]" />
                </div>
                <span className="font-black text-[var(--theme-nav-foreground)] tracking-tight">{club?.naam || "App"}</span>
              </div>
              <button onClick={logout} className="p-2 text-white/70 hover:text-white">
                 <LogOut size={20} />
             </button>
          </header>

          <main className="flex-1 w-full p-4 md:p-8 xl:p-12 overflow-y-auto">
            <Outlet />
          </main>
      </div>

      {/* Mobile Bottom Navigation - More premium feel */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--theme-nav-bg)] border-t border-white/10 flex overflow-x-auto z-50 p-2 gap-1 shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path.split('/').slice(0, 2).join('/'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center min-w-[70px] py-1.5 rounded-xl transition-all ${
                isActive
                  ? "bg-[var(--theme-primary)] text-white shadow-lg"
                  : "text-white/60"
              }`}
            >
              <Icon size={20} className={isActive ? "text-white" : "text-white/60"} />
              <span className="text-[10px] font-black uppercase mt-1 tracking-tighter">{item.label}</span>
            </Link>
          );
        })}
        {/* Toggle butten for 'More' could be added here if many items */}
      </nav>
    </div>
  );
}