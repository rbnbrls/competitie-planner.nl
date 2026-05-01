/*
 * File: frontend/src/pages/tenant/Users.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useState, useEffect } from "react";
import { tenantApi } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { inviteUserSchema, zodErrors } from "../../lib/schemas";
import { UserPlus, Edit, Shield, Mail, Calendar, UserCheck, UserMinus, AlertCircle } from "lucide-react";
import { showToast } from "../../components/Toast";
import { 
  Button, 
  Input, 
  Select, 
  Modal, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell, 
  Badge, 
  LoadingSkeleton 
} from "../../components";

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
    setIsLoading(true);
    tenantApi.listUsers().then((res) => {
      setUsers(res.data.users);
    }).catch(() => {
      showToast.error("Fout bij laden van gebruikers");
    }).finally(() => setIsLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingUser) {
        await tenantApi.updateUser(editingUser.id, formData);
        showToast.success("Gebruiker bijgewerkt");
      }
      loadUsers();
      setShowModal(false);
      setEditingUser(null);
    } catch {
      showToast.error("Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    const email = inviteData.email.trim();
    const validation = inviteUserSchema.safeParse({ email });
    if (!validation.success) {
      showToast.error(zodErrors(validation).email || "Voer een geldig e-mailadres in");
      return;
    }

    setIsSaving(true);

    try {
      await tenantApi.inviteUser({ ...inviteData, email: inviteData.email.trim() });
      showToast.success("Uitnodiging verstuurd naar " + inviteData.email);
      setShowInviteModal(false);
      setInviteData({ email: "", role: "planner" });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast.error(error.response?.data?.detail || "Fout bij uitnodigen");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (user: User) => {
    if (!confirm(`Weet je zeker dat je ${user.email} wilt deactiveren?`)) return;
    
    try {
      await tenantApi.deactivateUser(user.id);
      showToast.success("Gebruiker gedeactiveerd");
      loadUsers();
    } catch {
      showToast.error("Fout bij deactiveren");
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
    return <LoadingSkeleton rows={5} />;
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Gebruikersbeheer</h1>
          <p className="text-gray-500 font-medium">Beheer medewerkers en hun toegangsrechten.</p>
        </div>
        <Button onClick={() => setShowInviteModal(true)} className="gap-2">
          <UserPlus size={18} />
          Gebruiker uitnodigen
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Gebruiker</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Laatste login</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className={!user.is_active ? "bg-gray-50/50" : ""}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold border">
                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-gray-900">{user.full_name || "Nieuwe gebruiker"}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Mail size={12} />
                      {user.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="gap-1 font-medium">
                  <Shield size={12} className="text-blue-600" />
                  {ROLES.find((r) => r.value === user.role)?.label}
                </Badge>
              </TableCell>
              <TableCell>
                 <div className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                    <Calendar size={12} />
                    {user.last_login 
                      ? new Date(user.last_login).toLocaleDateString("nl-NL", { day: 'numeric', month: 'short', year: 'numeric' })
                      : "Nooit ingelogd"}
                 </div>
              </TableCell>
              <TableCell>
                <Badge variant={user.is_active ? "success" : "default"}>
                  {user.is_active ? "Actief" : "Inactief"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                    <Edit size={16} />
                  </Button>
                  {user.is_active && user.id !== currentUser?.id && (
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeactivate(user)}>
                      <UserMinus size={16} />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-40 text-center text-gray-500 font-medium">
                Geen gebruikers gevonden.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Gebruiker bewerken"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuleren</Button>
            <Button type="submit" form="user-edit-form" isLoading={isSaving} disabled={editingUser?.id === currentUser?.id}>Opslaan</Button>
          </>
        }
      >
        {editingUser?.id === currentUser?.id ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800">
             <AlertCircle size={20} className="flex-shrink-0" />
             <div className="text-sm">
                <p className="font-bold">Je beheert je eigen account</p>
                <p>Wijzigingen aan je eigen profiel en rol kunnen alleen door een andere beheerder worden gedaan om te voorkomen dat je jezelf buitensluit.</p>
             </div>
          </div>
        ) : (
          <form id="user-edit-form" onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Volledige naam"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Bijv. Jan de Vries"
            />
            <Select
              label="Rol"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              options={ROLES}
            />
            <div className="flex items-center gap-2 p-1 pt-2">
               <input
                  type="checkbox"
                  id="user-active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="user-active" className="text-sm font-bold text-gray-700 cursor-pointer flex items-center gap-2">
                   Account is actief
                   {formData.is_active ? <UserCheck size={14} className="text-green-500" /> : <UserMinus size={14} className="text-gray-400" />}
                </label>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Nieuwe gebruiker uitnodigen"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowInviteModal(false)}>Annuleren</Button>
            <Button type="submit" form="invite-form" isLoading={isSaving}>Uitnodiging versturen</Button>
          </>
        }
      >
        <form id="invite-form" onSubmit={handleInvite} className="space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed">
             Voer het e-mailadres in van de persoon die je wilt uitnodigen. Ze ontvangen een e-mail met een link om hun account in te stellen.
          </p>
          <Input
            type="email"
            label="E-mailadres"
            value={inviteData.email}
            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
            placeholder="collega@vereniging.nl"
            required
            autoFocus
          />
          <Select
            label="Toegewezen Rol"
            value={inviteData.role}
            onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
            options={ROLES}
          />
        </form>
      </Modal>
    </div>
  );
}