import { useState, useEffect } from "react";
import { tenantApi } from "../../lib/api";

interface Baan {
  id: string;
  nummer: number;
  naam: string | null;
  verlichting_type: string;
  overdekt: boolean;
  prioriteit_score: number;
  actief: boolean;
  notitie: string | null;
}

const VERLICHTING_TYPES = [
  { value: "geen", label: "Geen" },
  { value: "TL", label: "TL" },
  { value: "LED", label: "LED" },
  { value: "halogeen", label: "Halogeen" },
];

export default function BanenPage() {
  const [banen, setBanen] = useState<Baan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingBaan, setEditingBaan] = useState<Baan | null>(null);

  const [formData, setFormData] = useState({
    nummer: 1,
    naam: "",
    verlichting_type: "geen",
    overdekt: false,
    prioriteit_score: 5,
  });

  useEffect(() => {
    loadBanen();
  }, []);

  const loadBanen = () => {
    tenantApi.listBanen().then((res) => {
      setBanen(res.data.banen);
    }).finally(() => setIsLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      if (editingBaan) {
        await tenantApi.updateBaan(editingBaan.id, formData);
        setMessage("Baan bijgewerkt");
      } else {
        await tenantApi.createBaan(formData);
        setMessage("Baan toegevoegd");
      }
      loadBanen();
      setShowModal(false);
      setEditingBaan(null);
      setFormData({
        nummer: banen.length + 1,
        naam: "",
        verlichting_type: "geen",
        overdekt: false,
        prioriteit_score: 5,
      });
    } catch {
      setMessage("Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (baan: Baan) => {
    setEditingBaan(baan);
    setFormData({
      nummer: baan.nummer,
      naam: baan.naam || "",
      verlichting_type: baan.verlichting_type,
      overdekt: baan.overdekt,
      prioriteit_score: baan.prioriteit_score,
    });
    setShowModal(true);
  };

  const handleDeactivate = async (baan: Baan) => {
    if (!confirm(`Weet je zeker dat je baan ${baan.nummer} wilt deactiveren?`)) return;
    
    try {
      await tenantApi.deleteBaan(baan.id);
      loadBanen();
      setMessage("Baan gedeactiveerd");
    } catch {
      setMessage("Fout bij deactiveren");
    }
  };

  if (isLoading) {
    return <div className="p-4">Laden...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Banen</h1>
        <button
          onClick={() => {
            setEditingBaan(null);
            setFormData({
              nummer: banen.length + 1,
              naam: "",
              verlichting_type: "geen",
              overdekt: false,
              prioriteit_score: 5,
            });
            setShowModal(true);
          }}
          className="px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Baan toevoegen
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
        <div className="hidden md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nr.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Naam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Verlichting
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Overdekt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Prioriteit
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
              {banen.map((baan) => (
                <tr key={baan.id} className={!baan.actief ? "bg-gray-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap">{baan.nummer}</td>
                  <td className="px-6 py-4">{baan.naam || "-"}</td>
                  <td className="px-6 py-4">
                    {VERLICHTING_TYPES.find((v) => v.value === baan.verlichting_type)?.label}
                  </td>
                  <td className="px-6 py-4">{baan.overdekt ? "Ja" : "Nee"}</td>
                  <td className="px-6 py-4">{baan.prioriteit_score}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        baan.actief
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {baan.actief ? "Actief" : "Inactief"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(baan)}
                      className="text-blue-600 hover:text-blue-800 mr-4 min-h-[44px]"
                    >
                      Bewerken
                    </button>
                    {baan.actief && (
                      <button
                        onClick={() => handleDeactivate(baan)}
                        className="text-red-600 hover:text-red-800 min-h-[44px]"
                      >
                        Deactiveren
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-200">
          {banen.map((baan) => (
            <div key={baan.id} className={`p-4 ${!baan.actief ? "bg-gray-50" : ""}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-lg">Baan {baan.nummer}</div>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    baan.actief
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {baan.actief ? "Actief" : "Inactief"}
                </span>
              </div>
              {baan.naam && (
                <div className="text-gray-700 mb-2">{baan.naam}</div>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4 bg-white p-3 rounded border">
                <div>
                  <span className="block text-gray-400 text-xs uppercase">Verlichting</span>
                  {VERLICHTING_TYPES.find((v) => v.value === baan.verlichting_type)?.label}
                </div>
                <div>
                  <span className="block text-gray-400 text-xs uppercase">Overdekt</span>
                  {baan.overdekt ? "Ja" : "Nee"}
                </div>
                <div className="col-span-2">
                  <span className="block text-gray-400 text-xs uppercase">Prioriteit Score</span>
                  {baan.prioriteit_score}/10
                </div>
              </div>
              
              <div className="flex gap-3 border-t pt-3">
                <button
                  onClick={() => handleEdit(baan)}
                  className="flex-1 text-center py-2 bg-blue-50 text-blue-700 rounded-md text-sm font-medium active:bg-blue-100"
                >
                  Bewerken
                </button>
                {baan.actief && (
                  <button
                    onClick={() => handleDeactivate(baan)}
                    className="flex-1 text-center py-2 bg-red-50 text-red-700 rounded-md text-sm font-medium active:bg-red-100"
                  >
                    Deactiveren
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {banen.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nog geen banen toegevoegd
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingBaan ? "Baan bewerken" : "Baan toevoegen"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Baannummer
                  </label>
                  <input
                    type="number"
                    value={formData.nummer}
                    onChange={(e) => setFormData({ ...formData, nummer: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-md"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Naam (optioneel)
                  </label>
                  <input
                    type="text"
                    value={formData.naam}
                    onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
                    className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-md"
                    placeholder="Bijv. Baan 1 - Centre"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verlichting
                  </label>
                  <select
                    value={formData.verlichting_type}
                    onChange={(e) => setFormData({ ...formData, verlichting_type: e.target.value })}
                    className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-md"
                  >
                    {VERLICHTING_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.overdekt}
                      onChange={(e) => setFormData({ ...formData, overdekt: e.target.checked })}
                      className="mr-3 w-5 h-5 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Overdekt</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioriteit score (1-10)
                  </label>
                  <input
                    type="range"
                    value={formData.prioriteit_score}
                    onChange={(e) => setFormData({ ...formData, prioriteit_score: parseInt(e.target.value) })}
                    className="w-full h-8"
                    min="1"
                    max="10"
                  />
                  <div className="text-sm text-gray-500 text-center">{formData.prioriteit_score}</div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 min-h-[44px] text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 w-full sm:w-auto"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto"
                >
                  {isSaving ? "Opslaan..." : "Opslaan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}