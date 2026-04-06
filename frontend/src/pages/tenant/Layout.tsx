import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function TenantLayout() {
  const { club, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/competities", label: "Competities" },
    { path: "/instellingen", label: "Instellingen" },
    { path: "/branding", label: "Huisstijl" },
    { path: "/banen", label: "Banen" },
    { path: "/gebruikers", label: "Gebruikers" },
    { path: "/checkout", label: "Betalingen" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
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
          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium ${
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
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Uitloggen
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}