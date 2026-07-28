import { useState } from "react";
import { Link } from "react-router-dom";
import { Button as O2Button } from "@/components/o2/Button";
import { O2Logo } from "@/components/o2/Logo";
import { AuthBrandingPanel } from "@/components/auth/AuthBrandingPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        const authError = error as { code?: string; status?: number; message: string };
        const code = authError.code || "";
        const status = authError.status;
        const isRateLimit =
          status === 429 ||
          code === "over_email_send_rate_limit" ||
          /rate limit/i.test(error.message);

        toast({
          title: isRateLimit ? "Muitas tentativas" : "Erro ao enviar link",
          description: isRateLimit
            ? "Aguarde alguns minutos antes de pedir um novo link de recuperação."
            : error.message || "Não foi possível enviar o link. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Sempre mostrar sucesso (sem revelar se o e-mail existe)
      setSent(true);
      toast({
        title: "Verifique seu e-mail",
        description: "Se este e-mail existir, enviamos um link para redefinir a senha.",
      });
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
            Esqueceu sua <span className="text-primary">senha</span>?
          </>
        }
        description="Sem problema. Informe seu e-mail e enviaremos um link seguro para você criar uma nova senha."
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
              <CardTitle className="text-2xl">Recuperar senha</CardTitle>
              <CardDescription>
                {sent
                  ? "Enviamos um link de redefinição para o e-mail informado (se ele estiver cadastrado)."
                  : "Informe seu e-mail e enviaremos um link para redefinir sua senha."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!sent ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>

                  <O2Button type="submit" variant="primary" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Enviar link
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </O2Button>
                </form>
              ) : (
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                    <CheckCircle2 className="h-6 w-6" />
                  </span>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Confira sua caixa de entrada (e a pasta de spam).</p>
                    <p>O link expira em 1 hora.</p>
                  </div>
                </div>
              )}

              <div className="mt-6 text-center">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar ao login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
