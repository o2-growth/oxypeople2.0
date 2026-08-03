import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/** Logo do Google. Inline porque a CSP bloqueia imagem de host externo. */
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

/**
 * Entrada com a conta Google do domínio.
 *
 * `redirectTo` aponta para a origem atual em vez de uma URL fixa: o app roda
 * em produção, em preview da Vercel e em localhost, e uma URL fixa mandaria a
 * pessoa para o ambiente errado depois de autenticar.
 *
 * `hd` restringe a seleção às contas @o2inc.com.br — é dica ao Google, não
 * garantia; quem controla o acesso de fato é a RLS e o convite.
 */
export function GoogleSignInButton({ label = "Entrar com Google" }: { label?: string }) {
  const [carregando, setCarregando] = useState(false);

  const entrar = async () => {
    setCarregando(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { hd: "o2inc.com.br", prompt: "select_account" },
      },
    });
    if (error) {
      setCarregando(false);
      // Provider desligado no Supabase é o erro mais provável aqui, e a
      // mensagem crua ("Unsupported provider") não diz o que fazer.
      const desligado = /provider|not enabled|unsupported/i.test(error.message);
      toast.error("Não foi possível entrar com o Google", {
        description: desligado
          ? "O login com Google ainda não está habilitado. Use e-mail e senha."
          : error.message,
      });
    }
    // Em caso de sucesso a página navega para o Google; não desligar o
    // carregando aqui evita um piscar do botão antes do redirecionamento.
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={entrar}
      disabled={carregando}
      // h-11 casa com a altura dos campos do formulário; em telas pequenas o
      // alvo de toque precisa desse tamanho para ser confortável.
      className="h-11 w-full gap-3 text-base font-medium"
    >
      {carregando ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <GoogleLogo className="h-5 w-5" />
      )}
      {label}
    </Button>
  );
}
