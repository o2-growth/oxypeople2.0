import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button as O2Button } from "@/components/o2/Button";
import { O2Logo } from "@/components/o2/Logo";
import { AuthBrandingPanel } from "@/components/auth/AuthBrandingPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [invalidReason, setInvalidReason] = useState<"expired" | "invalid" | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        if (!cancelled) {
          setReady(true);
          setLinkInvalid(false);
          setInvalidReason(null);
        }
      }
    });

    const init = async () => {
      const url = new URL(window.location.href);
      const search = url.searchParams;
      // Hash params (fluxo implícito do Supabase) podem conter access_token OU error
      const hashStr = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hashStr);

      const errorParam = search.get("error") || hashParams.get("error");
      const errorCode = search.get("error_code") || hashParams.get("error_code");

      // 1) Erro explícito do Supabase (link expirado, já usado, access denied, etc.)
      if (errorParam || errorCode) {
        if (cancelled) return;
        setLinkInvalid(true);
        setInvalidReason(errorCode === "otp_expired" ? "expired" : "invalid");
        return;
      }

      // 2) Fluxo PKCE: ?code=...
      const code = search.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setLinkInvalid(true);
          setInvalidReason("invalid");
        } else {
          setReady(true);
          window.history.replaceState({}, "", url.pathname);
        }
        return;
      }

      // 3) Fluxo implícito (#access_token=...&type=recovery) ou sessão já ativa.
      // O SDK (detectSessionInUrl) processa o hash e dispara PASSWORD_RECOVERY/
      // SIGNED_IN, capturado pela subscription acima — essa é a fonte de verdade.
      // Como o evento pode ter disparado ANTES do subscribe, checamos a sessão
      // atual de forma síncrona (substitui o setTimeout mágico, que marcava link
      // válido como inválido em conexões lentas).
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setReady(true);
        return;
      }

      // 4) Sem sessão ainda: se há hash de recovery, aguardamos o evento do SDK
      // (não marcamos inválido para não descartar um link legítimo). Caso
      // contrário, não há token algum a validar — link inválido de fato.
      const isRecoveryHash =
        hashParams.get("type") === "recovery" && !!hashParams.get("access_token");
      if (!isRecoveryHash) {
        setLinkInvalid(true);
        setInvalidReason("invalid");
      }
    };

    init();

    // Escape hatch: se em 10s nada resolveu (evento do SDK nunca disparou para
    // um hash de recovery — conexão muito lenta ou hash malformado), re-checa a
    // sessão e decide, evitando o usuário preso em "Validando link…". Idempotente:
    // se algum caminho já marcou ready/inválido, isto vira no-op.
    const fallback = setTimeout(async () => {
      if (cancelled) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setReady(true);
      } else {
        setLinkInvalid(true);
        setInvalidReason("invalid");
      }
    }, 10000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({
        title: "Senha muito curta",
        description: "A senha precisa ter pelo menos 8 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirm) {
      toast({
        title: "Senhas não coincidem",
        description: "Confirme a nova senha corretamente.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({
          title: "Erro ao redefinir senha",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Senha redefinida!",
        description: "Faça login com sua nova senha.",
      });

      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex animate-fade-in">
      {/* Left Side - Branding */}
      <AuthBrandingPanel
        headline={
          <>
            Defina sua <span className="text-primary">nova senha</span>
          </>
        }
        description="Use uma senha forte e única para proteger sua conta."
      />

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-accent-glow p-2">
              <O2Logo variant="icon" forceTheme="dark" className="h-full w-full" />
            </div>
            <span className="text-2xl font-bold">Oxy People</span>
          </div>

          <Card className="border-0 shadow-xl animate-slide-up">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl">Nova senha</CardTitle>
              <CardDescription>
                {linkInvalid
                  ? invalidReason === "expired"
                    ? "Este link expirou ou já foi usado. Solicite um novo link de recuperação."
                    : "Link inválido. Abra o link mais recente do seu e-mail ou solicite um novo."
                  : "Escolha uma nova senha de pelo menos 8 caracteres."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {linkInvalid ? (
                <O2Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/auth/reset")}
                >
                  Pedir novo link
                </O2Button>
              ) : !ready ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Validando link...
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirmar senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirm"
                        type="password"
                        placeholder="••••••••"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  <O2Button type="submit" variant="primary" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Redefinir senha
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </O2Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
