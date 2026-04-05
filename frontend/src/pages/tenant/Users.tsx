import { useState, useEffect } from "react";
import { tenantApi } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  last_login: string | null;
}

const ROLES = [
  { value: "vereniging_admin", label: "Vereniging Admin" },
  { value: "planner", label: "Planner" },
];

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    role: "planner",
    is_active: true,
  });

  const [inviteData, setInviteData] = useState({
    email: "",
    role: "planner",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    tenantApi.listUsers().then((res) => {
      setUsers(res.data.users);
    }).finally(() => setIsLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      if (editingUser) {
        await tenantApi.updateUser(editingUser.id, formData);
        setMessage("Gebruiker bijgewerkt");
      }
      loadUsers();
      setShowModal(false);
      setEditingUser(null);
    } catch {
      setMessage("Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      await tenantApi.inviteUser(inviteData);
      setMessage("Uitnodiging verstuurd");
      setShowInviteModal(false);
      setInviteData({ email: "", role: "planner" });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setMessage(error.response?.data?.detail || "Fout bij uitnodigen");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (user: User) => {
    if (!confirm(`Weet je zeker dat je ${user.email} wilt deactiveren?`)) return;
    
    try {
      await tenantApi.deactivateUser(user.id);
      loadUsers();
      setMessage("Gebruiker gedeactiveerd");
    } catch {
      setMessage("Fout bij deactiveren");
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || "",
      role: user.role,
      is_active: user.is_active,
    });
    setShowModal(true);
  };

  if (isLoading) {
    return <div className="p-4">Laden...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gebruikers</h1>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Gebruiker uitnodigen
        </button>
      </div>

      {message && !message.includes("Fout") && (
        <div className="mb-4 p-3 rounded bg-green-100 text-green-700">
          {message}
        </div>
      )}

      {message.includes("Fout") && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700">
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Naam
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Laatste login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className={!user.is_active ? "bg-gray-50" : ""}>
                <td className="px-6 py-4">{user.full_name || "-"}</td>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">
                  {ROLES.find((r) => r.value === user.role)?.label}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {user.last_login 
                    ? new Date(user.last_login).toLocaleDateString("nl-NL")
                    : "Nooit"}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      user.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.is_active ? "Actief" : "Inactief"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Bewerken
                  </button>
                  {user.is_active && user.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDeactivate(user)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Deactiveren
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nog geen gebruikers
          </div>
        )}
      </div>

      {showModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Gebruiker bewerken</h2>

            {editingUser.id === currentUser?.id && (
              <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded">
                Je kunt je eigen account niet bewerken
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Naam
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={editingUser.id === currentUser?.id}
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                {editingUser.id !== currentUser?.id && (
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Actief</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSaving || editingUser.id === currentUser?.id}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Opslaan..." : "Opslaan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Gebruiker uitnodigen</h2>

            <form onSubmit={handleInvite}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol
                  </label>
                  <select
                    value={inviteData.role}
                    onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Versturen..." : "Uitnodigen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}