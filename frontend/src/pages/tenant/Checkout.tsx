import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { paymentApi, tenantApi } from "../../lib/api";

const COMPETITIONS = [
  "Voorjaarscompetitie",
  "Zomeravondcompetitie",
  "Najaarscompetitie",
  "Wintercompetitie",
  "8&9 Tennis",
];

interface CheckoutStatus {
  has_active_mandate: boolean;
  paid_competitions: string[];
  mandate_status: string | null;
}

export default function CheckoutPage() {
  const { user: _user } = useAuth();
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [iban, setIban] = useState("");
  const [consumerName, setConsumerName] = useState("");
  const [selectedCompetition, setSelectedCompetition] = useState(COMPETITIONS[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingMandate, setIsCreatingMandate] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [club, setClub] = useState<{ max_banen: number; status: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusRes, clubRes] = await Promise.all([
        paymentApi.getCheckoutStatus(),
        tenantApi.getClub(),
      ]);
      setStatus(statusRes.data);
      setClub(clubRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMandate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingMandate(true);
    setError(null);
    setSuccess(null);
    try {
      await paymentApi.createMandate({ iban, consumer_name: consumerName });
      setSuccess("Machtiging aangemaakt. Verifieer met je bank en kom later terug.");
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Machtiging aanmaken mislukt");
    } finally {
      setIsCreatingMandate(false);
    }
  };

  const handleVerifyMandate = async () => {
    if (!status) return;
    setIsCreatingMandate(true);
    setError(null);
    try {
      setSuccess("Verificatie succesvol!");
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Verificatie mislukt");
    } finally {
      setIsCreatingMandate(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingPayment(true);
    setError(null);
    setSuccess(null);
    try {
      const webhookUrl = `${window.location.origin}/api/v1/payments/webhook`;
      await paymentApi.createPayment(selectedCompetition, webhookUrl);
      setSuccess("Betaling succesvol verwerkt!");
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Betaling mislukt");
    } finally {
      setIsCreatingPayment(false);
    }
  };

  if (isLoading) {
    return <div className="p-8">Laden...</div>;
  }

  const hasActiveMandate = status?.has_active_mandate || false;
  const paidCompetitions = status?.paid_competitions || [];

  if (!hasActiveMandate) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Betaling &amp; Machtiging</h1>
          <p className="text-gray-600">
            Om gebruik te maken van de planner moet je een SEPA incasso machtiging afgeven.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-800">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-4 rounded-lg bg-green-50 text-green-800">{success}</div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">SEPA Machtiging</h2>
          <p className="text-sm text-gray-600 mb-4">
            Met een SEPA machtiging kunnen we het bedrag automatisch van je rekening afschrijven.
            Vul hieronder je bankgegevens in om de machtiging te ondertekenen.
          </p>
          <form onSubmit={handleCreateMandate}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rekeninghouder naam</label>
              <input
                type="text"
                value={consumerName}
                onChange={(e) => setConsumerName(e.target.value)}
                placeholder="Naam zoals op bankrekening"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value.replace(/\s/g, "").toUpperCase())}
                placeholder="NL91 ABNA 0417 1643 00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <p><strong>Let op:</strong> Door deze machtiging te ondertekenen geef je toestemming om het verschuldigde bedrag automatisch van je rekening af te schrijven.</p>
            </div>
            <button
              type="submit"
              disabled={isCreatingMandate || !iban || !consumerName}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreatingMandate ? "Machtiging aanmaken..." : "Machtiging ondertekenen"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Betaling &amp; Machtiging</h1>
        <p className="text-gray-600">
          Beheer je machtiging en betaal per competitie.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-800">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 rounded-lg bg-green-50 text-green-800">{success}</div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Machtiging status</h2>
          {status?.mandate_status === "pending" && (
            <button
              onClick={handleVerifyMandate}
              disabled={isCreatingMandate}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreatingMandate ? "Verifieren..." : "Verifieer status"}
            </button>
          )}
        </div>
        <div className="flex items-center">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            Actief
          </span>
          <span className="ml-2 text-sm text-gray-600">
            Je hebt een actieve SEPA machtiging.
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Betaal per Competitie</h2>
        <p className="text-sm text-gray-600 mb-4">
          {club && club.max_banen >= 7
            ? "Je vereniging heeft 7 of meer banen, dus je betaalt het grote tarief."
            : "Je vereniging heeft minder dan 7 banen, dus je betaalt het kleine tarief."}
        </p>

        {COMPETITIONS.map((competition) => {
          const isPaid = paidCompetitions.includes(competition);
          return (
            <div key={competition} className="border rounded-lg p-4 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{competition}</h3>
                  {isPaid ? (
                    <span className="text-sm text-green-600">Betaald</span>
                  ) : (
                    <span className="text-sm text-gray-500">Nog niet betaald</span>
                  )}
                </div>
                {isPaid ? (
                  <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                    Toegang
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      setSelectedCompetition(competition);
                      handlePay(e);
                    }}
                    disabled={isCreatingPayment}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isCreatingPayment ? "Betaling..." : "Nu betalen"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}