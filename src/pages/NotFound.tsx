import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { O2Logo } from "@/components/o2/Logo";
import { Button as O2Button } from "@/components/o2/Button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Loga só em desenvolvimento — evita ruído em produção a cada 404.
    if (import.meta.env.DEV) {
      console.error("404: rota inexistente acessada:", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 text-center">
      {/* Branding O2, consistente com as telas de autenticação */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary p-2 shadow-accent-glow">
          <O2Logo variant="icon" forceTheme="dark" className="h-full w-full" />
        </div>
        <span className="text-2xl font-bold">Oxy People</span>
      </div>

      <div className="space-y-3">
        <p className="text-6xl font-display font-bold text-primary">404</p>
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <p className="mx-auto max-w-md text-muted-foreground">
          A página que você procura não existe, mudou de endereço ou não está mais
          disponível.
        </p>
      </div>

      <O2Button asChild variant="primary">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Voltar para o início
        </Link>
      </O2Button>
    </div>
  );
};

export default NotFound;
