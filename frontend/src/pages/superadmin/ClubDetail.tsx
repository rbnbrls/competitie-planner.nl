import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { superadminApi } from "../../lib/api";

interface Club {
  id: string;
  naam: string;
  slug: string;
  status: string;
  is_sponsored?: boolean;
  adres?: string;
  postcode?: string;
  stad?: string;
  telefoon?: string;
  website?: string;
  max_banen?: number;
  trial_ends_at?: string;
  created_at: string;
}

export default function ClubDetailPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Club>>({});

  useEffect(() => {
    if (!clubId) return;
    superadminApi
      .getClub(clubId)
      .then((res) => setClub(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [clubId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!club || !clubId) return;

    if (newStatus === "suspended" && club.status !== "suspended") {
      setShowSuspendConfirm(true);
      return;
    }

    setIsSaving(true);
    try {
      await superadminApi.updateClub(clubId, { status: newStatus });
      setClub({ ...club, status: newStatus });
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmSuspend = async () => {
    if (!club || !clubId) return;
    setIsSaving(true);
    setShowSuspendConfirm(false);
    try {
      await superadminApi.updateClub(clubId, { status: "suspended" });
      setClub({ ...club, status: "suspended" });
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSponsorToggle = async (checked: boolean) => {
    if (!club || !clubId) return;
    setIsSaving(true);
    try {
      const res = await superadminApi.updateSponsor(clubId, checked);
      setClub({ ...club, is_sponsored: res.data.is_sponsored });
    } catch (err) {
      console.error(err);
      alert("Failed to update sponsor status");
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = () => {
    if (!club) return;
    setEditForm({
      naam: club.naam,
      slug: club.slug,
      adres: club.adres,
      postcode: club.postcode,
      stad: club.stad,
      telefoon: club.telefoon,
      website: club.website,
      max_banen: club.max_banen,
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!club || !clubId || !editForm.naam || !editForm.slug) return;
    setIsSaving(true);
    try {
      const res = await superadminApi.updateClub(clubId, editForm);
      setClub(res.data);
      setIsEditing(false);
      setEditForm({});
    } catch (err) {
      console.error(err);
      alert("Failed to update club");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!club) return <div>Club not found</div>;

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      trial: "bg-blue-100 text-blue-800",
      suspended: "bg-red-100 text-red-800",
      inactive: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "actief",
      trial: "trial",
      suspended: "gesuspendeerd",
      inactive: "inactief",
    };
    return labels[status] || status;
  };

  return (
    <div>
      <div className="mb-4">
        <Link to="/clubs" className="text-blue-600 hover:underline">&larr; Terug naar verenigingen</Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            {isEditing ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-sm text-gray-600">Naam</label>
                  <input
                    type="text"
                    value={editForm.naam || ""}
                    onChange={(e) => setEditForm({ ...editForm, naam: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Subdomein</label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={editForm.slug || ""}
                      onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <span className="ml-2 text-gray-500">.competitie-planner.nl</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold">{club.naam}</h2>
                <p className="text-gray-500">{club.slug}.competitie-planner.nl</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={cancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Annuleren
                </button>
                <button
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {isSaving ? "Opslaan..." : "Opslaan"}
                </button>
              </>
            ) : (
              <button
                onClick={startEdit}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Bewerken
              </button>
            )}
            <span className={`px-3 py-1 rounded ${getStatusBadge(club.status)}`}>
              {getStatusLabel(club.status)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="font-semibold mb-2">Contactgegevens</h3>
            {isEditing ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-sm text-gray-600">Adres</label>
                  <input
                    type="text"
                    value={editForm.adres || ""}
                    onChange={(e) => setEditForm({ ...editForm, adres: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600">Postcode</label>
                    <input
                      type="text"
                      value={editForm.postcode || ""}
                      onChange={(e) => setEditForm({ ...editForm, postcode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600">Stad</label>
                    <input
                      type="text"
                      value={editForm.stad || ""}
                      onChange={(e) => setEditForm({ ...editForm, stad: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Telefoon</label>
                  <input
                    type="text"
                    value={editForm.telefoon || ""}
                    onChange={(e) => setEditForm({ ...editForm, telefoon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Website</label>
                  <input
                    type="text"
                    value={editForm.website || ""}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Max. banen</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.max_banen || ""}
                    onChange={(e) => setEditForm({ ...editForm, max_banen: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-600">{club.adres || "-"}</p>
                <p className="text-gray-600">{club.postcode} {club.stad}</p>
                <p className="text-gray-600">{club.telefoon || "-"}</p>
                <p className="text-gray-600">{club.website || "-"}</p>
                <p className="text-gray-600">Max. banen: {club.max_banen || "-"}</p>
              </>
            )}
          </div>
          <div>
            <h3 className="font-semibold mb-2">Platform</h3>
            <p className="text-gray-600">Aangemaakt: {new Date(club.created_at).toLocaleDateString("nl-NL")}</p>
            {club.trial_ends_at && (
              <p className="text-gray-600">Trial eindigt: {new Date(club.trial_ends_at).toLocaleDateString("nl-NL")}</p>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          {!isEditing && (
            <>
              <h3 className="font-semibold mb-4">Status wijzigen</h3>
              <div className="flex gap-2">
                <select
                  value={club.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isSaving}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="trial">Trial</option>
                  <option value="active">Actief</option>
                  <option value="suspended">Gesuspendeerd</option>
                  <option value="inactive">Inactief</option>
                </select>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={club.is_sponsored || false}
                    onChange={(e) => handleSponsorToggle(e.target.checked)}
                    disabled={isSaving}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Gesponsord (gratis platform)</span>
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {showSuspendConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h3 className="text-lg font-bold mb-4">Vereniging suspenderen?</h3>
            <p className="mb-4 text-gray-600">
              Weet je zeker dat je deze vereniging wilt suspenderen? Gebruikers van deze vereniging zullen geen toegang meer hebben tot het platform.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSuspendConfirm(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Annuleren
              </button>
              <button
                onClick={confirmSuspend}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Suspenderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}