/*
 * File: frontend/src/pages/tenant/Banen.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useState, useEffect } from "react";
import { tenantApi } from "../../lib/api";
import { Plus, Edit, Trash2, Sun, Umbrella, Star } from "lucide-react";
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
  Card,
  LoadingSkeleton 
} from "../../components";

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
  const [showModal, setShowModal] = useState(false);
  const [editingBaan, setEditingBaan] = useState<Baan | null>(null);

  const [formData, setFormData] = useState({
    nummer: 1,
    naam: "",
    verlichting_type: "geen",
    overdekt: false,
    prioriteit_score: 5,
  });
  const [deletingBaan, setDeletingBaan] = useState<Baan | null>(null);

  useEffect(() => {
    loadBanen();
  }, []);

  const loadBanen = () => {
    setIsLoading(true);
    tenantApi.listBanen().then((res) => {
      setBanen(res.data.banen);
    }).catch(() => {
      showToast.error("Fout bij laden van banen");
    }).finally(() => setIsLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingBaan) {
        const updatedBaan = { ...editingBaan, ...formData };
        setBanen(banen.map((b) => (b.id === editingBaan.id ? updatedBaan : b)));
        await tenantApi.updateBaan(editingBaan.id, formData);
        showToast.success("Baan bijgewerkt");
      } else {
        await tenantApi.createBaan(formData);
        showToast.success("Baan toegevoegd");
      }
      loadBanen();
      setShowModal(false);
      resetForm();
    } catch {
      loadBanen();
      showToast.error("Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setEditingBaan(null);
    setFormData({
      nummer: banen.length + 1,
      naam: "",
      verlichting_type: "geen",
      overdekt: false,
      prioriteit_score: 5,
    });
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

  const handleDeactivate = async () => {
    if (!deletingBaan) return;
    
    setIsSaving(true);
    try {
      setBanen(banen.map((b) => (b.id === deletingBaan.id ? { ...b, actief: false } : b)));
      await tenantApi.deleteBaan(deletingBaan.id);
      showToast.success("Baan gedeactiveerd");
      loadBanen();
    } catch {
      loadBanen();
      showToast.error("Fout bij deactiveren");
    } finally {
      setIsSaving(false);
      setDeletingBaan(null);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton rows={8} />;
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Tennisbanen</h1>
          <p className="text-gray-500 font-medium">Beheer de beschikbare banen van de club.</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="gap-2"
        >
          <Plus size={18} />
          Baan toevoegen
        </Button>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Nr.</TableHead>
              <TableHead>Naam</TableHead>
              <TableHead>Verlichting</TableHead>
              <TableHead>Overdekt</TableHead>
              <TableHead>Prioriteit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banen.map((baan) => (
              <TableRow key={baan.id} className={!baan.actief ? "bg-gray-50/50" : ""}>
                <TableCell className="font-bold text-gray-900">{baan.nummer}</TableCell>
                <TableCell className="font-medium">{baan.naam || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Sun size={14} className={baan.verlichting_type !== 'geen' ? "text-amber-500" : "text-gray-300"} />
                    {VERLICHTING_TYPES.find((v) => v.value === baan.verlichting_type)?.label}
                  </div>
                </TableCell>
                <TableCell>
                   {baan.overdekt ? (
                     <Badge variant="secondary" className="gap-1">
                       <Umbrella size={12} /> Ja
                     </Badge>
                   ) : "Nee"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    <span className="font-bold">{baan.prioriteit_score}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={baan.actief ? "success" : "default"}>
                    {baan.actief ? "Actief" : "Inactief"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(baan)}>
                      <Edit size={16} />
                    </Button>
                    {baan.actief && (
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeletingBaan(baan)}>
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {banen.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-gray-500 font-medium">
                  Geen banen geconfigureerd.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {banen.map((baan) => (
          <Card key={baan.id} className={!baan.actief ? "bg-gray-50/80" : ""}>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-200">
                    {baan.nummer}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{baan.naam || `Baan ${baan.nummer}`}</h3>
                    <div className="flex gap-2 mt-1">
                       {baan.overdekt && <Badge variant="outline" className="text-[10px] h-4">Overdekt</Badge>}
                       <Badge variant="outline" className="text-[10px] h-4">{VERLICHTING_TYPES.find(v => v.value === baan.verlichting_type)?.label} verlichting</Badge>
                    </div>
                  </div>
                </div>
                <Badge variant={baan.actief ? "success" : "default"}>
                  {baan.actief ? "Actief" : "In"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2">
                 <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Prioriteit</span>
                    <span className="font-black text-gray-700">{baan.prioriteit_score}</span>
                 </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button variant="secondary" className="flex-1 h-11" onClick={() => handleEdit(baan)}>
                  Bewerken
                </Button>
                {baan.actief && (
                  <Button variant="ghost" className="text-red-500 h-11" onClick={() => setDeletingBaan(baan)}>
                    <Trash2 size={18} />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingBaan ? "Baan bewerken" : "Baan toevoegen"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuleren</Button>
            <Button type="submit" form="baan-form" isLoading={isSaving}>Opslaan</Button>
          </>
        }
      >
        <form id="baan-form" onSubmit={handleSubmit} className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                label="Baannummer"
                value={formData.nummer}
                onChange={(e) => setFormData(prev => ({ ...prev, nummer: parseInt(e.target.value) }))}
                required
                min="1"
              />
              <Select
                label="Verlichting"
                value={formData.verlichting_type}
                onChange={(e) => setFormData(prev => ({ ...prev, verlichting_type: e.target.value }))}
                options={VERLICHTING_TYPES}
              />
           </div>

          <Input
            label="Naam (optioneel)"
            value={formData.naam}
            onChange={(e) => setFormData(prev => ({ ...prev, naam: e.target.value }))}
            placeholder="Bijv. Baan 1 - Centre"
          />

          <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center justify-between">
             <div className="space-y-0.5">
                <span className="text-sm font-medium text-blue-900">Overdekte baan</span>
                <p className="text-xs text-blue-700">Is deze baan binnen of overkapt?</p>
             </div>
             <input
                type="checkbox"
                checked={formData.overdekt}
                onChange={(e) => setFormData(prev => ({ ...prev, overdekt: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-gray-700">Prioriteit score (1-10)</label>
              <Badge variant="primary" className="font-black h-6 w-8 justify-center">{formData.prioriteit_score}</Badge>
            </div>
            <p className="text-xs text-gray-500 italic">Hogere scores krijgen voorkeur bij automatische planning.</p>
            <input
              type="range"
              value={formData.prioriteit_score}
              onChange={(e) => setFormData(prev => ({ ...prev, prioriteit_score: parseInt(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              min="1"
              max="10"
            />
            <div className="flex justify-between text-[10px] font-bold text-gray-400">
               <span>LAAG</span>
               <span>HOOG</span>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingBaan}
        onClose={() => setDeletingBaan(null)}
        title="Baan deactiveren"
        description={`Weet je zeker dat je baan ${deletingBaan?.nummer} wilt deactiveren?`}
        maxWidth="xs"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingBaan(null)}>Annuleren</Button>
            <Button variant="danger" onClick={handleDeactivate} isLoading={isSaving}>Deactiveren</Button>
          </>
        }
      >
        <p className="text-gray-600">
          De baan wordt gemarkeerd als inactief en kan niet meer worden gebruikt voor wedstrijden.
        </p>
      </Modal>
    </div>
  );
}