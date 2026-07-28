import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Ícone ilustrativo (sem lib de ilustração — decisão libraries.md §6). */
  icon: LucideIcon;
  /** Título orientador em pt-BR (ex.: "Nenhum objetivo ainda"). */
  title: string;
  /** O que fazer a respeito. */
  description?: string;
  /** CTA opcional. */
  action?: { label: string; onClick: () => void };
  className?: string;
}

/**
 * Estado vazio padrão do app.
 *
 * Use quando `!data?.length` (nunca para mascarar erro — nesse caso use
 * `QueryError`). Ícone em círculo `bg-muted`, título `font-medium`,
 * descrição em `text-muted-foreground` e CTA `variant="outline"`.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        <Button variant="outline" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
