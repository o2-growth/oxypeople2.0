import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Título da página. Herda a fonte editorial O2 (font-display global). */
  title: string;
  /** Subtítulo opcional, orientando o usuário. */
  description?: string;
  /** Ícone opcional exibido à esquerda do título. */
  icon?: LucideIcon;
  /** Ações à direita (ação primária da página). */
  actions?: ReactNode;
  /** Linha extra abaixo do cabeçalho (filtros/tabs). */
  children?: ReactNode;
  className?: string;
}

/**
 * Cabeçalho de página padrão do OxyPeople.
 *
 * Substitui os `<div><h1/><p/></div>` ad-hoc espalhados pelas ~38 páginas
 * (com `text-2xl`/`text-3xl` divergentes e tipografia legada). O título
 * usa `font-display` — a tipografia editorial O2 herdada do CSS global — e a
 * margem inferior única (`mb-6`) elimina o spacing improvisado.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {Icon ? (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-bold leading-tight">{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
