import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { tenantApi } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("slug") || window.location.hostname.split(".")[0];
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await tenantApi.forgotPassword(email, slug);
      setSuccess(true);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || "Fout bij versturen");
      } else {
        setError("Onverwachte fout");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-4">Email verzonden!</h1>
          <p className="text-gray-600 mb-4">Als dit emailadres bij ons bekend is, ontvang je binnenkort een link om je wachtwoord te resetten.</p>
          <button
            onClick={() => navigate(`/${slug}/login`)}
            className="text-blue-600 hover:text-blue-800"
          >
            Terug naar login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Wachtwoord vergeten</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
              Emailadres
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Verzenden..." : "Verstuur reset link"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate(`/${slug}/login`)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Terug naar login
          </button>
        </div>
      </div>
    </div>
  );
}