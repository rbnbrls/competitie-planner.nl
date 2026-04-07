import { useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { tenantApi } from "../../lib/api";
import { passwordSchema, zodErrors } from "../../lib/schemas";
import { ShieldCheck, Lock, UserCheck, ArrowRight, Sparkles } from "lucide-react";
import { showToast } from "../../components/Toast";
import { 
  Button, 
  Card, 
  CardContent,
  Input
} from "../../components";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("slug") || window.location.hostname.split(".")[0];
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      const errs = zodErrors(validation);
      showToast.error(errs.password || errs.confirmPassword || "Validatiefout");
      return;
    }

    setIsLoading(true);

    try {
      await tenantApi.acceptInvite(token || "", password);
      setSuccess(true);
      showToast.success("Account geactiveerd!");
      setTimeout(() => navigate(`/${slug}/login`), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      showToast.error(axiosErr.response?.data?.detail || "Fout bij activeren");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md border-none shadow-2xl ring-1 ring-emerald-100 overflow-hidden text-center py-12 px-6 space-y-6">
           <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-50">
             <UserCheck size={40} />
           </div>
           <div className="space-y-2">
             <h1 className="text-3xl font-black text-gray-900 tracking-tight">Welkom aan boord!</h1>
             <p className="text-gray-500 font-medium">Je account is succesvol geactiveerd. We sturen je door naar de login pagina...</p>
           </div>
           <div className="flex justify-center">
              <div className="h-1.5 w-32 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 animate-[loading_3s_ease-in-out]" />
              </div>
           </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
           <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100 text-white p-3">
             <Sparkles size={32} />
           </div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">Activeer je account</h1>
           <p className="text-gray-500 font-medium italic">Stel een veilig wachtwoord in om te beginnen.</p>
        </div>

        <Card className="border-none shadow-2xl ring-1 ring-gray-100 overflow-hidden">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                id="password"
                type="password"
                label="Wachtwoord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                icon={<Lock size={16} />}
                helperText="Minimaal 8 tekens en 1 cijfer"
                autoFocus
              />

              <Input
                id="confirmPassword"
                type="password"
                label="Bevestig wachtwoord"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                icon={<ShieldCheck size={16} />}
              />

              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full h-12 shadow-lg shadow-blue-100 gap-2 font-black"
              >
                Account Activeren
                <ArrowRight size={18} />
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
           Beveiligd door Competitie Planner NL
        </p>
      </div>
    </div>
  );
}