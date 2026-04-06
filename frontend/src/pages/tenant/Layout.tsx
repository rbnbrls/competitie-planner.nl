import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function TenantLayout() {
  const { club, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/competities", label: "Competities" },
    { path: "/dagoverzicht", label: "Dagoverzicht" },
    { path: "/instellingen", label: "Instellingen" },
    { path: "/branding", label: "Huisstijl" },
    { path: "/banen", label: "Banen" },
    { path: "/gebruikers", label: "Gebruikers" },
    { path: "/checkout", label: "Betalingen" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {club?.logo_url && (
              <img src={club.logo_url} alt="Logo" className="h-10 w-10 object-contain" />
            )}
            <h1 className="text-xl font-bold text-gray-900">
              {club?.naam || "Vereniging"}
            </h1>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium min-h-[44px] flex items-center ${
                  location.pathname === item.path
                    ? "text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900 min-h-[44px] flex items-center"
            >
              Uitloggen
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex overflow-x-auto z-50">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`min-w-[80px] min-h-[64px] flex items-center justify-center px-4 text-sm font-medium whitespace-nowrap ${
              location.pathname === item.path
                ? "text-blue-600 bg-blue-50 border-t-2 border-blue-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <button
          onClick={logout}
          className="min-w-[80px] min-h-[64px] flex items-center justify-center px-4 text-sm font-medium text-gray-600 whitespace-nowrap hover:bg-gray-50"
        >
          Uitloggen
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}