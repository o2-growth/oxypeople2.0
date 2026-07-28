import type { ReactNode } from "react";

import { O2Logo } from "@/components/o2/Logo";

interface AuthBrandingPanelProps {
  /** Manchete grande (aceita `<span>` coloridos e `<br />`). */
  headline: ReactNode;
  /** Parágrafo de apoio. */
  description: ReactNode;
  /** Slot opcional abaixo da descrição (ex.: prova social). */
  children?: ReactNode;
}

/**
 * Painel de branding O2 (lado esquerdo do split-screen) das telas públicas de
 * autenticação. Consolida as ~40 linhas duplicadas em Auth/ForgotPassword/
 * ResetPassword. A cor do padrão de grade sai de token (`--primary`) em vez
 * do rgba cru anterior.
 */
export function AuthBrandingPanel({
  headline,
  description,
  children,
}: AuthBrandingPanelProps) {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden">
      {/* Tech grid pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary p-2.5 shadow-accent-glow">
            <O2Logo variant="icon" forceTheme="dark" className="h-full w-full" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Oxy People</h1>
            <p className="text-white/70">by O2 Inc</p>
          </div>
        </div>

        <h2 className="mb-6 text-4xl font-display font-bold leading-tight text-white lg:text-5xl">
          {headline}
        </h2>

        <p className="max-w-md text-lg text-white/80">{description}</p>

        {children}
      </div>
    </div>
  );
}
