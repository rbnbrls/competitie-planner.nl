import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { superadminApi } from "../../lib/api";

interface Club {
  id: string;
  naam: string;
  slug: string;
  status: string;
  adres?: string;
  postcode?: string;
  stad?: string;
  telefoon?: string;
  website?: string;
  trial_ends_at?: string;
  created_at: string;
}

export default function ClubDetailPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);

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

  return (
    <div>
      <div className="mb-4">
        <Link to="/clubs" className="text-blue-600 hover:underline">&larr; Terug naar verenigingen</Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">{club.naam}</h2>
            <p className="text-gray-500">{club.slug}.competitie-planner.nl</p>
          </div>
          <span className={`px-3 py-1 rounded ${getStatusBadge(club.status)}`}>
            {club.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="font-semibold mb-2">Contactgegevens</h3>
            <p className="text-gray-600">{club.adres || "-"}</p>
            <p className="text-gray-600">{club.postcode} {club.stad}</p>
            <p className="text-gray-600">{club.telefoon || "-"}</p>
            <p className="text-gray-600">{club.website || "-"}</p>
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