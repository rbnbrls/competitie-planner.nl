import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { authApi, paymentApi } from "./lib/api";
import { ToastContainer } from "./components/Toast";

const LoginPage = lazy(() => import("./pages/Login"));
const RegisterAdminPage = lazy(() => import("./pages/admin/RegisterAdmin"));
const DashboardPage = lazy(() => import("./pages/superadmin/Dashboard"));
const ClubsPage = lazy(() => import("./pages/superadmin/Clubs"));
const NewClubPage = lazy(() => import("./pages/superadmin/NewClub"));
const ClubDetailPage = lazy(() => import("./pages/superadmin/ClubDetail"));
const UsersPage = lazy(() => import("./pages/superadmin/Users"));
const PaymentsPage = lazy(() => import("./pages/superadmin/Payments"));
const TenantLoginPage = lazy(() => import("./pages/tenant/Login"));
const TenantLayout = lazy(() => import("./pages/tenant/Layout"));
const TenantDashboard = lazy(() => import("./pages/tenant/Dashboard"));
const SettingsPage = lazy(() => import("./pages/tenant/Settings"));
const BrandingPage = lazy(() => import("./pages/tenant/Branding"));
const BanenPage = lazy(() => import("./pages/tenant/Banen"));
const UsersTenantPage = lazy(() => import("./pages/tenant/Users"));
const InvitePage = lazy(() => import("./pages/tenant/Invite"));
const ForgotPasswordPage = lazy(() => import("./pages/tenant/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("./pages/tenant/ResetPassword"));
const CompetitiesPage = lazy(() => import("./pages/tenant/Competities"));
const TeamsPage = lazy(() => import("./pages/tenant/Teams"));
const SpeelrondesPage = lazy(() => import("./pages/tenant/Speelrondes"));
const RondeDetailPage = lazy(() => import("./pages/tenant/RondeDetail"));
const PrintView = lazy(() => import("./pages/tenant/PrintView"));
const HistoriePage = lazy(() => import("./pages/tenant/Historie"));
const CheckoutPage = lazy(() => import("./pages/tenant/Checkout"));
const DisplayPage = lazy(() => import("./pages/Display"));
const ClubCalendarPage = lazy(() => import("./pages/ClubCalendar"));
const DagoverzichtPage = lazy(() => import("./pages/tenant/Dagoverzicht"));
const SeizoensoverzichtPage = lazy(() => import("./pages/tenant/Seizoensoverzicht"));
const OnboardingPage = lazy(() => import("./pages/Onboarding"));
const CaptainPortaalPage = lazy(() => import("./pages/CaptainPortaal"));

function LoadingFallback() {
  return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
}

function TenantRoutes() {
  const { user } = useAuth();
  const [paymentStatus, setPaymentStatus] = useState<{ has_active_mandate: boolean; paid_competitions: string[]; is_sponsored?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      return;
    }
    const publicPaths = ["/login", "/checkout", "/invite", "/forgot-password", "/reset-password", "/onboarding", "/display/"];
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
    return <LoadingFallback />;
  }

  const isCheckoutPage = location.pathname === "/checkout";
  const isOnboardingPage = location.pathname === "/onboarding";
  const isDevMode = import.meta.env.DEV;
  const hasAccess = isDevMode || (paymentStatus?.is_sponsored) || (paymentStatus?.has_active_mandate && paymentStatus.paid_competitions.length > 0);
  const allowedWithoutPayment = ["/instellingen", "/branding", "/banen", "/gebruikers", "/onboarding", "/dashboard", "/dagoverzicht"].some(p => location.pathname.startsWith(p));

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
    return <LoadingFallback />;
  }

  if (adminExists === false) {
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <>
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Superadmin Panel</h1>
              <div className="hidden lg:ml-8 lg:flex lg:space-x-4">
                <a href="/dashboard" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
                <a href="/clubs" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Verenigingen</a>
                <a href="/users" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Gebruikers</a>
              </div>
            </div>
            <div className="hidden lg:flex items-center">
              <span className="text-sm text-gray-600 mr-4">{auth.user?.email}</span>
              <button onClick={() => { auth.logout(); window.location.href = '/login'; }} className="text-sm text-gray-600 hover:text-gray-900">Uitloggen</button>
            </div>
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="lg:hidden border-t">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a href="/dashboard" className="block text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
              <a href="/clubs" className="block text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Verenigingen</a>
              <a href="/users" className="block text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Gebruikers</a>
            </div>
            <div className="pt-4 pb-4 border-t px-4">
              <span className="text-sm text-gray-600 block">{auth.user?.email}</span>
              <button onClick={() => { auth.logout(); window.location.href = '/login'; }} className="text-sm text-gray-600 hover:text-gray-900 mt-2">Uitloggen</button>
            </div>
          </div>
        )}
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
    return <LoadingFallback />;
  }

  const isAdminPanel = hostname === "admin.competitie-planner.nl" || hostname === "admin.localhost" || hostname === "localhost" || hostname === "127.0.0.1";
  const isDisplayPanel = hostname === "display.competitie-planner.nl" || hostname === "display.localhost";
  const isTenant = !isAdminPanel && !isDisplayPanel;

  if (isAdminPanel) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="*" element={<AdminWrapper />} />
        </Routes>
      </Suspense>
    );
  }

  if (isDisplayPanel) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/:slug/kalender" element={<ClubCalendarPage />} />
          <Route path="/:slug" element={<DisplayPage />} />
          <Route path="/:slug/:token" element={<DisplayPage />} />
          <Route path="*" element={<DisplayPage />} />
        </Routes>
      </Suspense>
    );
  }

  if (isTenant) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<TenantLoginPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/captain/:token" element={<CaptainPortaalPage />} />
          <Route path="/display" element={<DisplayPage />} />
          <Route path="/display/:token" element={<DisplayPage />} />
          <Route path="/display/:slug" element={<DisplayPage />} />
          <Route path="/display/:slug/:token" element={<DisplayPage />} />
          <Route path="/narrowcasting" element={<DisplayPage />} />
          <Route path="/narrowcasting/:token" element={<DisplayPage />} />
          <Route path="/display/:slug/kalender" element={<ClubCalendarPage />} />
          <Route path="/narrowcasting/:slug/kalender" element={<ClubCalendarPage />} />
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
              <Route path="/ronde/:rondeId/:competitieId/print" element={<PrintView />} />
              <Route path="/historie/:competitieId" element={<HistoriePage />} />
              <Route path="/seizoensoverzicht/:competitieId" element={<SeizoensoverzichtPage />} />
              <Route path="/dagoverzicht" element={<DagoverzichtPage />} />
              <Route path="/dagoverzicht/:datum" element={<DagoverzichtPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return <div className="p-8">Unknown module</div>;
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <ToastContainer />
    </AuthProvider>
  );
}

export default App;