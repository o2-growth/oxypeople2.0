import { Badge } from "@/components/ui/badge";

/**
 * Badge de status compartilhado.
 *
 * Consolida os mapas `STATUS_BADGE` duplicados no módulo de PDI e de 1:1s.
 * As cores saem dos tokens do `Badge` (`default`/`secondary`/`outline`/
 * `destructive`) — nada de paleta crua.
 */
export type StatusBadgeVariant = "default" | "secondary" | "outline" | "destructive";

export interface StatusConfig {
  label: string;
  variant: StatusBadgeVariant;
}

export type StatusMap = Record<string, StatusConfig>;

/** Vocabulário de status de PDI. */
export const PDI_STATUS: StatusMap = {
  draft: { label: "Rascunho", variant: "outline" },
  active: { label: "Ativo", variant: "default" },
  completed: { label: "Concluído", variant: "secondary" },
  canceled: { label: "Cancelado", variant: "destructive" },
};

/** Vocabulário de status de reuniões 1:1. */
export const ONE_ON_ONE_STATUS: StatusMap = {
  scheduled: { label: "Agendada", variant: "default" },
  completed: { label: "Concluída", variant: "secondary" },
  canceled: { label: "Cancelada", variant: "destructive" },
  no_show: { label: "Não realizada", variant: "outline" },
};

interface StatusBadgeProps {
  status: string;
  /** Mapa status→config (ex.: `PDI_STATUS`, `ONE_ON_ONE_STATUS`). */
  map: StatusMap;
  className?: string;
}

export function StatusBadge({ status, map, className }: StatusBadgeProps) {
  const config = map[status];
  if (!config) return null;
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
