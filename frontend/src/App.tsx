import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import LoginPage from "./pages/Login";
import SuperadminLayout from "./pages/superadmin/Layout";
import DashboardPage from "./pages/superadmin/Dashboard";
import ClubsPage from "./pages/superadmin/Clubs";
import ClubDetailPage from "./pages/superadmin/ClubDetail";
import NewClubPage from "./pages/superadmin/NewClub";
import UsersPage from "./pages/superadmin/Users";

function App() {
  const hostname = window.location.hostname;

  const getModule = () => {
    if (hostname === "admin.competitie-planner.nl") {
      return "superadmin";
    } else if (hostname === "display.competitie-planner.nl") {
      return "display";
    }
    const subdomain = hostname.split(".")[0];
    return `tenant: ${subdomain}`;
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/" element={
            hostname === "admin.competitie-planner.nl" ? <SuperadminLayout /> : <div className="p-8">{getModule()}</div>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="clubs" element={<ClubsPage />} />
            <Route path="clubs/new" element={<NewClubPage />} />
            <Route path="clubs/:clubId" element={<ClubDetailPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;