import { Routes, Route } from "react-router-dom";

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
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<div className="p-8">{getModule()}</div>} />
      </Routes>
    </div>
  );
}

export default App;