import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/Login";
import RegisterAdminPage from "./pages/admin/RegisterAdmin";
import DashboardPage from "./pages/superadmin/Dashboard";
import ClubsPage from "./pages/superadmin/Clubs";
import NewClubPage from "./pages/superadmin/NewClub";
import ClubDetailPage from "./pages/superadmin/ClubDetail";
import UsersPage from "./pages/superadmin/Users";
import PaymentsPage from "./pages/superadmin/Payments";
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
import CheckoutPage from "./pages/tenant/Checkout";
import DisplayPage from "./pages/Display";
import DagoverzichtPage from "./pages/tenant/Dagoverzicht";
import OnboardingPage from "./pages/Onboarding";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { authApi, paymentApi } from "./lib/api";

function TenantRoutes() {
  const { user } = useAuth();
  const [paymentStatus, setPaymentStatus] = useState<{ has_active_mandate: boolean; paid_competitions: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      return;
    }
    const publicPaths = ["/login", "/checkout", "/invite", "/forgot-password", "/reset-password", "/onboarding"];
    if (publicPaths.some(p => location.pathname.startsWith(p))) {
      setIsLoading(false);
      return;
    }

    paymentApi.getCheckoutStatus()
      .then(res => setPaymentStatus(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user, location.pathname]);

  if (!user) {
    return <TenantLoginPage />;
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
  }

  const isCheckoutPage = location.pathname === "/checkout";
  const isOnboardingPage = location.pathname === "/onboarding";
  const hasAccess = paymentStatus?.has_active_mandate && paymentStatus.paid_competitions.length > 0;
  const allowedWithoutPayment = ["/instellingen", "/branding", "/banen", "/gebruikers", "/onboarding"].some(p => location.pathname.startsWith(p));

  if (!hasAccess && !isCheckoutPage && !allowedWithoutPayment) {
    return <Navigate to="/checkout" replace />;
  }

  if (isOnboardingPage && user.onboarding_completed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function AdminWrapper() {
  const { user, isLoading: authLoading } = useAuth();
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    authApi.adminExists()
      .then((res) => setAdminExists(res.data.exists))
      .catch(() => setAdminExists(false))
      .finally(() => setIsChecking(false));
  }, []);

  if (isChecking || authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
  }

  if (!adminExists) {
    return <RegisterAdminPage onRegisterSuccess={() => window.location.reload()} />;
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!user.is_superadmin) {
    return <Navigate to="/login" replace />;
  }

  return <AdminRoutesInner />;
}

function AdminRoutesInner() {
  const auth = useAuth();
  
  return (
    <>
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Superadmin Panel</h1>
              <div className="ml-8 flex space-x-4">
                <a href="/dashboard" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
                <a href="/clubs" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Verenigingen</a>
                <a href="/users" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Gebruikers</a>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-4">{auth.user?.email}</span>
              <button onClick={() => { auth.logout(); window.location.href = '/login'; }} className="text-sm text-gray-600 hover:text-gray-900">Uitloggen</button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clubs" element={<ClubsPage />} />
          <Route path="/clubs/new" element={<NewClubPage />} />
          <Route path="/clubs/:clubId" element={<ClubDetailPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
        </Routes>
      </main>
    </>
  );
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
        <Route path="*" element={<AdminWrapper />} />
      </Routes>
    );
  }

  if (isDisplayPanel) {
    return (
      <Routes>
        <Route path="/:slug" element={<DisplayPage />} />
        <Route path="/:slug/:token" element={<DisplayPage />} />
        <Route path="*" element={<DisplayPage />} />
      </Routes>
    );
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
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/dashboard" element={<TenantDashboard />} />
            <Route path="/instellingen" element={<SettingsPage />} />
            <Route path="/branding" element={<BrandingPage />} />
            <Route path="/banen" element={<BanenPage />} />
            <Route path="/gebruikers" element={<UsersTenantPage />} />
            <Route path="/competities" element={<CompetitiesPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/teams/:competitieId" element={<TeamsPage />} />
            <Route path="/rondes/:competitieId" element={<SpeelrondesPage />} />
            <Route path="/ronde/:rondeId/:competitieId" element={<RondeDetailPage />} />
            <Route path="/historie/:competitieId" element={<HistoriePage />} />
            <Route path="/dagoverzicht" element={<DagoverzichtPage />} />
            <Route path="/dagoverzicht/:datum" element={<DagoverzichtPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  return <div className="p-8">Unknown module</div>;
}

import { ToastContainer } from "./components/Toast";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <ToastContainer />
    </AuthProvider>
  );
}

export default App;