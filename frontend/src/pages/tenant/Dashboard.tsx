import { useAuth } from "../../contexts/AuthContext";

export default function TenantDashboard() {
  const { user, club } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Welkom {user?.full_name || user?.email}
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Vereniging</h3>
          <p className="text-xl font-bold">{club?.naam}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
          <p className="text-xl font-bold capitalize">{club?.status}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Jouw rol</h3>
          <p className="text-xl font-bold capitalize">{user?.role?.replace("_", " ")}</p>
        </div>
      </div>
    </div>
  );
}