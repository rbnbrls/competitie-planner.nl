import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/Login";
import SuperadminLayout from "./pages/superadmin/Layout";
import DashboardPage from "./pages/superadmin/Dashboard";
import ClubsPage from "./pages/superadmin/Clubs";
import NewClubPage from "./pages/superadmin/NewClub";
import ClubDetailPage from "./pages/superadmin/ClubDetail";
import UsersPage from "./pages/superadmin/Users";
import TenantLoginPage from "./pages/tenant/Login";
import TenantLayout from "./pages/tenant/Layout";
import TenantDashboard from "./pages/tenant/Dashboard";
import SettingsPage from "./pages/tenant/Settings";
import BrandingPage from "./pages/tenant/Branding";
import BanenPage from "./pages/tenant/Banen";
import UsersTenantPage from "./pages/tenant/Users";
import InvitePage from "./pages/tenant/Invite";
import ForgotPasswordPage from "./pages/tenant/ForgotPassword";
import ResetPasswordPage from "./pages/tenant/ResetPassword";
import CompetitiesPage from "./pages/tenant/Competities";
import TeamsPage from "./pages/tenant/Teams";
import SpeelrondesPage from "./pages/tenant/Speelrondes";
import RondeDetailPage from "./pages/tenant/RondeDetail";
import HistoriePage from "./pages/tenant/Historie";

function SuperadminRoutes() {
  const { user } = useAuth();
  if (!user?.is_superadmin) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function TenantRoutes() {
  const { user } = useAuth();
  if (!user) {
    return <TenantLoginPage />;
  }
  return <Outlet />;
}

function AppRoutes() {
  const { isLoading } = useAuth();
  const hostname = window.location.hostname;

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
  }

  const isAdminPanel = hostname === "admin.competitie-planner.nl";
  const isDisplayPanel = hostname === "display.competitie-planner.nl";
  const isTenant = !isAdminPanel && !isDisplayPanel;

  if (isAdminPanel) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<SuperadminLayout />}>
          <Route element={<SuperadminRoutes />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/clubs" element={<ClubsPage />} />
            <Route path="/clubs/new" element={<NewClubPage />} />
            <Route path="/clubs/:clubId" element={<ClubDetailPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  if (isDisplayPanel) {
    return <div className="p-8">Display module - coming soon</div>;
  }

  if (isTenant) {
    return (
      <Routes>
        <Route path="/login" element={<TenantLoginPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route element={<TenantLayout />}>
          <Route element={<TenantRoutes />}>
            <Route path="/dashboard" element={<TenantDashboard />} />
            <Route path="/instellingen" element={<SettingsPage />} />
            <Route path="/branding" element={<BrandingPage />} />
            <Route path="/banen" element={<BanenPage />} />
            <Route path="/gebruikers" element={<UsersTenantPage />} />
            <Route path="/competities" element={<CompetitiesPage />} />
            <Route path="/teams/:competitieId" element={<TeamsPage />} />
            <Route path="/rondes/:competitieId" element={<SpeelrondesPage />} />
            <Route path="/ronde/:rondeId/:competitieId" element={<RondeDetailPage />} />
            <Route path="/historie/:competitieId" element={<HistoriePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  return <div className="p-8">Unknown module</div>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;