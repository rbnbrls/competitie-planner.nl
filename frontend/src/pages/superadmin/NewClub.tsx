import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { superadminApi } from "../../lib/api";
import { newClubSchema, zodErrors } from "../../lib/schemas";

export default function NewClubPage() {
  const navigate = useNavigate();
  const [naam, setNaam] = useState("");
  const [slug, setSlug] = useState("");
  const [contactNaam, setContactNaam] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
  };

  const handleNaamChange = (value: string) => {
    setNaam(value);
    const newSlug = generateSlug(value);
    if (!slug || slug === newSlug) {
      setSlug(newSlug);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = newClubSchema.safeParse({ naam, slug, contactEmail });
    if (!validation.success) {
      setFieldErrors(zodErrors(validation));
      return;
    }
    setFieldErrors({});
    setIsLoading(true);

    try {
      await superadminApi.createClub({
        naam: naam.trim(),
        slug,
        admin_email: contactEmail.trim() || undefined,
        admin_full_name: contactNaam.trim() || undefined,
      });
      navigate("/clubs");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || "Failed to create club");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div>
      <div className="mb-4">
        <Link to="/clubs" className="text-blue-600 hover:underline">&larr; Terug naar verenigingen</Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">Nieuwe Vereniging</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="naam" className="block text-gray-700 font-medium mb-2">
              Verenigingsnaam *
            </label>
            <input
              id="naam"
              type="text"
              value={naam}
              onChange={(e) => handleNaamChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.naam ? "border-red-500" : "border-gray-300"}`}
            />
            {fieldErrors.naam && <p className="text-red-500 text-sm mt-1">{fieldErrors.naam}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="slug" className="block text-gray-700 font-medium mb-2">
              Subdomain (slug) *
            </label>
            <div className="flex items-center">
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.slug ? "border-red-500" : "border-gray-300"}`}
                maxLength={30}
              />
              <span className="ml-2 text-gray-500">.competitie-planner.nl</span>
            </div>
            {fieldErrors.slug && <p className="text-red-500 text-sm mt-1">{fieldErrors.slug}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="contactNaam" className="block text-gray-700 font-medium mb-2">
              Contactpersoon naam
            </label>
            <input
              id="contactNaam"
              type="text"
              value={contactNaam}
              onChange={(e) => setContactNaam(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="contactEmail" className="block text-gray-700 font-medium mb-2">
              Contactpersoon email
            </label>
            <input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.contactEmail ? "border-red-500" : "border-gray-300"}`}
            />
            {fieldErrors.contactEmail
              ? <p className="text-red-500 text-sm mt-1">{fieldErrors.contactEmail}</p>
              : <p className="text-sm text-gray-500 mt-1">Er wordt een uitnodigingsemail verstuurd naar dit emailadres</p>
            }
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate("/clubs")}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Aanmaken..." : "Vereniging aanmaken"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}