/*
 * File: frontend/src/pages/tenant/PrintView.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRondeDetail, Toewijzing } from "../../hooks/useRondeDetail";
import { useAuth } from "../../contexts/AuthContext";
import { tenantApi } from "../../lib/api";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft, Download } from "lucide-react";
import { Button, LoadingSkeleton } from "../../components";

interface Team {
  id: string;
  naam: string;
  captain_naam?: string;
  speelklasse?: string;
}

interface Baan {
  id: string;
  nummer: number;
  naam?: string;
  prioriteit_score: number;
  overdekt: boolean;
  verlichting_type: string;
  notitie?: string;
}

export default function PrintView() {
  const { rondeId, competitieId } = useParams<{ rondeId: string; competitieId: string }>();
  const navigate = useNavigate();
  const { club } = useAuth();
  const { ronde, banen, teams, isLoadingRonde } = useRondeDetail(rondeId,  competitieId);

  useEffect(() => {
    // Set page title for print filename
    if (ronde) {
      document.title = `Banenindeling - ${new Date(ronde.datum).toLocaleDateString("nl-NL")} - ${club?.naam}`;
    }
  }, [ronde, club]);

  if (isLoadingRonde) return <LoadingSkeleton rows={20} />;
  if (!ronde) return (
    <div className="min-h-screen flex items-center justify-center">
       <div className="text-center">
         <h1 className="text-2xl font-black mb-4">Ronde niet gevonden</h1>
         <Button onClick={() => navigate(-1)}>Ga terug</Button>
       </div>
    </div>
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!rondeId) return;
    try {
      const res = await tenantApi.exportRondePdf(rondeId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `banenindeling-${new Date(ronde.datum).toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("PDF download failed", err);
      window.alert("Fout bij het downloaden van PDF.");
    }
  };

  const publicUrl = `${window.location.origin}/public/ronde/${ronde.public_token}`;

  return (
    <div className="min-h-screen bg-gray-100 p-0 md:p-8 flex flex-col items-center">
      <style>{`
        @media print {
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .print\\:hidden { display: none !important; }
          @page {
            size: A4;
            margin: 15mm;
          }
          .print-layout {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
        }
        .print-text-lg { font-size: 16pt; }
        .print-text-xl { font-size: 24pt; }
        .print-text-sm { font-size: 12pt; }
      `}</style>

      {/* Action Bar - Hidden during print */}
      <div className="w-full max-w-4xl bg-white shadow-md rounded-2xl p-4 mb-8 flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 font-bold text-blue-600">
          <ArrowLeft size={18} /> Terug naar detail
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 h-11" onClick={handleDownloadPdf}>
            <Download size={18} /> PDF Export
          </Button>
          <Button onClick={handlePrint} className="gap-2 h-11 shadow-lg shadow-blue-100">
            <Printer size={18} /> Afdrukken (Ctrl/Cmd + P)
          </Button>
        </div>
      </div>

      {/* Print Content */}
      <div 
        className="print-layout w-[210mm] min-h-[297mm] bg-white p-[20mm] shadow-2xl rounded-sm print:rounded-none"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-12 border-b-4 border-blue-600 pb-8">
          <div>
            <h1 className="print-text-xl font-black text-gray-900 mb-2">Banenindeling</h1>
            <p className="print-text-lg font-bold text-gray-600">
              {new Date(ronde.datum).toLocaleDateString("nl-NL", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-blue-600 font-black uppercase tracking-widest mt-2">{club?.naam}</p>
          </div>
          {club?.logo_url ? (
            <img src={club.logo_url} alt="Logo" className="h-24 w-auto object-contain" />
          ) : (
            <div className="h-24 w-24 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-4xl font-black">
              {club?.naam?.charAt(0)}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="mb-12">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="border-2 border-gray-300 px-6 py-4 text-left print-text-lg font-black uppercase tracking-wider w-32 bg-gray-50">Baan</th>
                <th className="border-2 border-gray-300 px-6 py-4 text-left print-text-lg font-black uppercase tracking-wider bg-gray-50">Team / Wedstrijd</th>
                <th className="border-2 border-gray-300 px-6 py-4 text-left print-text-lg font-black uppercase tracking-wider w-40 bg-gray-50">Tijd</th>
              </tr>
            </thead>
            <tbody>
              {(ronde.toewijzingen || [])
                .sort((a: Toewijzing, b: Toewijzing) => {
                  const bA = banen.find((bn: Baan) => bn.id === a.baan_id);
                  const bB = banen.find((bn: Baan) => bn.id === b.baan_id);
                  return (bA?.nummer || 0) - (bB?.nummer || 0);
                })
                .map((t: Toewijzing, idx: number) => {
                  const team = teams.find((tm: Team) => tm.id === t.team_id);
                  const baan = banen.find((bn: Baan) => bn.id === t.baan_id);
                  return (
                    <tr key={t.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}>
                      <td className="border-2 border-gray-300 px-6 py-6 text-center">
                        <span className="print-text-xl font-black">{baan?.nummer || "-"}</span>
                      </td>
                      <td className="border-2 border-gray-300 px-6 py-6">
                        <div className="print-text-lg font-black text-gray-900">{team?.naam || "-"}</div>
                        {t.notitie && <div className="print-text-sm text-gray-500 italic mt-1 font-medium italic">{t.notitie}</div>}
                      </td>
                      <td className="border-2 border-gray-300 px-6 py-6 whitespace-nowrap">
                        <div className="print-text-lg font-bold text-gray-700">
                          {t.tijdslot_start?.slice(0, 5)} - {t.tijdslot_eind?.slice(0, 5)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Footer with QR Code */}
        <div className="mt-20 flex items-end justify-between border-t-2 border-gray-200 pt-8">
          <div className="max-w-md">
            <h3 className="font-black text-gray-900 mb-2 print-text-lg">Live stand & wijzigingen</h3>
            <p className="print-text-sm text-gray-600 leading-relaxed font-medium">
              Scan de QR-code voor de meest actuele banenindeling, uitslagen en live updates van vandaag op jouw telefoon.
            </p>
            <p className="mt-4 font-mono text-[10pt] text-gray-300 select-all">
              {publicUrl}
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="p-3 border-4 border-gray-900 rounded-2xl bg-white">
              <QRCodeSVG value={publicUrl} size={130} level="H" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest mt-2 text-gray-400">Scan mij</span>
          </div>
        </div>

        {/* Info text */}
        <div className="mt-12 text-center text-gray-400 text-[10pt] italic font-medium">
          Gegenereerd door Competitie-Planner.nl op {new Date().toLocaleString("nl-NL")}
        </div>
      </div>
    </div>
  );
}
