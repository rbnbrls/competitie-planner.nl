/*
 * File: frontend/src/pages/tenant/Checkout.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { paymentApi, tenantApi } from "../../lib/api";
import { CreditCard, ShieldCheck, CheckCircle2, Info, Landmark, HelpCircle, ArrowRight, ShieldAlert, Clock, Target, Trophy } from "lucide-react";
import { showToast } from "../../components/Toast";
import { 
  Button, 
  Badge, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  LoadingSkeleton,
  Input
} from "../../components";

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
  iban: string | null;
}

export default function CheckoutPage() {
  useAuth();
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [iban, setIban] = useState("");
  const [consumerName, setConsumerName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingMandate, setIsCreatingMandate] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
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
      showToast.error("Fout bij laden van betaalgegevens");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMandate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingMandate(true);
    try {
      await paymentApi.createMandate({ iban, consumer_name: consumerName });
      showToast.success("Machtiging aangemaakt. Verifieer met je bank.");
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast.error(error.response?.data?.detail || "Machtiging aanmaken mislukt");
    } finally {
      setIsCreatingMandate(false);
    }
  };

  const handleVerifyMandate = async () => {
    if (!status) return;
    setIsCreatingMandate(true);
    try {
      showToast.success("Verificatie succesvol!");
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast.error(error.response?.data?.detail || "Verificatie mislukt");
    } finally {
      setIsCreatingMandate(false);
    }
  };

  const handlePay = async (competition: string) => {
    setIsCreatingPayment(true);
    try {
      const webhookUrl = `${window.location.origin}/api/v1/payments/webhook`;
      await paymentApi.createPayment(competition, webhookUrl);
      showToast.success(`Betaling voor ${competition} voltooid!`);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast.error(error.response?.data?.detail || "Betaling mislukt");
    } finally {
      setIsCreatingPayment(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton rows={10} />;
  }

  const hasActiveMandate = status?.has_active_mandate || false;
  const paidCompetitions = status?.paid_competitions || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 border-none p-0 flex items-center gap-3">
             <CreditCard className="text-blue-600" />
             Abonnement & Betalingen
          </h1>
          <p className="text-gray-500 font-medium">Beheer je SEPA-incasso machtiging en betaal per competitie.</p>
        </div>
      </div>

      {!hasActiveMandate ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-none shadow-sm ring-1 ring-gray-100 overflow-hidden">
               <CardHeader className="bg-blue-600 text-white pb-8">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck size={20} />
                    Activeer SEPA Machtiging
                  </CardTitle>
                  <CardDescription className="text-blue-100">
                    Om de planner te gebruiken is een eenmalige machtiging nodig voor automatische incasso.
                  </CardDescription>
               </CardHeader>
               <CardContent className="p-6 -mt-4 bg-white rounded-t-3xl">
                  <form onSubmit={handleCreateMandate} className="space-y-6">
                    <Input
                      label="Rekeninghouder naam"
                      value={consumerName}
                      onChange={(e) => setConsumerName(e.target.value)}
                      placeholder="Naam zoals op bankrekening"
                      required
                    />
                    <Input
                      label="IBAN"
                      value={iban}
                      onChange={(e) => setIban(e.target.value.replace(/\s/g, "").toUpperCase())}
                      placeholder="NL91 ABNA 0417 1643 00"
                      required
                    />
                    
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-4">
                       <div className="p-2 bg-white rounded-lg border shadow-sm">
                         <Info size={18} className="text-blue-500" />
                       </div>
                       <p className="text-xs text-gray-500 leading-relaxed font-medium">
                         Door deze machtiging te ondertekenen via Mollie, geef je <span className="font-bold text-gray-900">Competitie Planner NL</span> toestemming om verschuldigde bedragen voor competities automatisch van je rekening af te schrijven.
                       </p>
                    </div>

                    <Button
                      type="submit"
                      isLoading={isCreatingMandate}
                      disabled={!iban || !consumerName}
                      className="w-full h-12 shadow-lg shadow-blue-100 gap-2 font-black"
                    >
                      Machtiging Ondertekenen
                      <ArrowRight size={18} />
                    </Button>
                  </form>
               </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
             <section className="space-y-4">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                   <HelpCircle size={14} /> Veelgestelde vragen
                </h3>
                <div className="space-y-4">
                   <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-sm font-bold text-gray-900 mb-1">Hoe werkt de machtiging?</p>
                      <p className="text-xs text-gray-500 leading-relaxed">Je wordt doorverwezen naar Mollie om een testtransactie van €0,01 te doen. Hiermee bevestig je je rekening.</p>
                   </div>
                   <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-sm font-bold text-gray-900 mb-1">Wanneer wordt er afgeschreven?</p>
                      <p className="text-xs text-gray-500 leading-relaxed">Alleen op het moment dat je expliciet kiest voor "Nu betalen" bij een competitie op deze pagina.</p>
                   </div>
                </div>
             </section>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-sm ring-1 ring-gray-100 overflow-hidden">
               <CardHeader className="bg-emerald-600 text-white">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck size={20} />
                    Machtiging Actief
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <Landmark size={24} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">IBAN</p>
                        <p className="font-mono text-sm font-black text-gray-900">{status?.iban || "Geverifieerd"}</p>
                     </div>
                  </div>

                  {status?.mandate_status === "pending" && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                       <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-widest">
                          <Clock size={14} /> In afwachting
                       </div>
                       <p className="text-xs text-amber-700 font-medium">Je machtiging wordt nog verwerkt door de bank.</p>
                       <Button variant="secondary" onClick={handleVerifyMandate} isLoading={isCreatingMandate} className="w-full h-9 bg-white border-amber-200 text-amber-700">Verifieer Status</Button>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-50">
                     <Badge variant="success" className="w-full justify-center py-1.5 gap-2 uppercase tracking-tighter">
                        <CheckCircle2 size={12} />
                        Klaar voor gebruik
                     </Badge>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-blue-50/50 border-blue-100">
               <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-black text-xs uppercase tracking-widest">
                     <Info size={16} /> Park Tarief
                  </div>
                  <p className="text-sm text-blue-800 font-medium leading-relaxed">
                    {club && club.max_banen >= 7
                      ? "Je vereniging heeft 7 of meer banen. Je betaalt het Standard tarief van €149,- per competitie."
                      : "Je vereniging heeft minder dan 7 banen. Je betaalt het Basic tarief van €89,- per competitie."}
                  </p>
               </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                   <Target size={20} className="text-blue-600" />
                   Per Competitie Betalen
                </h3>
                <Badge variant="outline" className="font-bold">{paidCompetitions.length} Betaald</Badge>
             </div>

             <div className="space-y-4">
                {COMPETITIONS.map((competition) => {
                  const isPaid = paidCompetitions.includes(competition);
                  return (
                    <Card key={competition} className={`group border-none ring-1 transition-all ${isPaid ? 'ring-emerald-100 bg-emerald-50/20' : 'ring-gray-100 bg-white hover:ring-blue-100 shadow-sm'}`}>
                      <CardContent className="p-5 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${isPaid ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-100 text-gray-300 group-hover:text-blue-500 transition-colors'}`}>
                               <Trophy size={20} />
                            </div>
                            <div>
                               <h4 className="font-black text-gray-900 border-none p-0">{competition}</h4>
                               {isPaid ? (
                                 <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase tracking-widest mt-0.5">
                                    <CheckCircle2 size={12} /> Betaald & Actief
                                 </div>
                               ) : (
                                 <p className="text-xs text-gray-400 font-medium mt-0.5 tracking-tight">Geen actieve licentie voor dit seizoen</p>
                               )}
                            </div>
                         </div>
                         
                         {isPaid ? (
                           <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                              <ShieldCheck size={20} />
                           </div>
                         ) : (
                           <Button 
                             onClick={() => handlePay(competition)} 
                             isLoading={isCreatingPayment}
                             className="h-10 px-4 gap-2 font-black text-xs uppercase tracking-tighter"
                            >
                              <CreditCard size={16} />
                              Betalen
                           </Button>
                         )}
                      </CardContent>
                    </Card>
                  );
                })}
             </div>

             <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-start gap-4">
                 <ShieldAlert size={20} className="text-gray-400 flex-shrink-0" />
                 <p className="text-xs text-gray-500 leading-relaxed font-bold italic">
                   Betalingen worden direct verwerkt. Facturen worden verstuurd naar het geregistreerde e-mailadres van de hoofdbeheerder.
                 </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}