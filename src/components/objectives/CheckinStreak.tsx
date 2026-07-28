import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flame, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOkrSettings } from "@/hooks/useCheckins";
import type { Checkin } from "@/hooks/useCheckins";

/** Substantivos por frequência de check-in, com concordância do adjetivo. */
const PERIOD_LABELS: Record<string, { many: string; adj: string }> = {
  weekly: { many: "semanas", adj: "seguidas" },
  biweekly: { many: "quinzenas", adj: "seguidas" },
  monthly: { many: "meses", adj: "seguidos" },
};

/**
 * Índice do período (janela fixa pela frequência de check-in) que contém `date`.
 * Semanal/quinzenal usam janelas de 7/14 dias a partir da época; mensal usa o
 * mês-calendário (UTC). Serve só para agrupar check-ins em períodos consistentes.
 */
function periodIndex(date: Date, frequency: string): number {
  if (frequency === "monthly") {
    return date.getUTCFullYear() * 12 + date.getUTCMonth();
  }
  const periodDays = frequency === "biweekly" ? 14 : 7;
  return Math.floor(date.getTime() / 86_400_000 / periodDays);
}

/**
 * "Streak simples": nº de períodos consecutivos (pela frequência de check-in da
 * empresa) com ao menos um check-in, contados do período atual para trás. Há
 * carência de um período: se ainda não houve check-in no período corrente mas
 * houve no anterior, a sequência segue ativa. Qualquer gap zera a sequência.
 *
 * Versão deliberadamente simples e defensável (§3.3): agrupa por janelas fixas,
 * ignora múltiplos check-ins no mesmo período (contam como 1) e não tenta
 * modelar feriados/periodicidade por objetivo.
 */
export function computeCheckinStreak(
  checkins: Pick<Checkin, "created_at">[],
  frequency = "weekly",
): number {
  if (!checkins?.length) return 0;
  const periods = new Set(checkins.map((c) => periodIndex(new Date(c.created_at), frequency)));
  const current = periodIndex(new Date(), frequency);

  let anchor: number;
  if (periods.has(current)) anchor = current;
  else if (periods.has(current - 1)) anchor = current - 1;
  else return 0;

  let streak = 0;
  for (let p = anchor; periods.has(p); p--) streak++;
  return streak;
}

interface CheckinStreakProps {
  /** Histórico de check-ins do KR (de `useCheckins`), ordem indiferente. */
  checkins: Pick<Checkin, "created_at">[];
  /** `last_checkin_at` do KR quando disponível; senão deriva do check-in mais recente. */
  lastCheckinAt?: string | null;
  className?: string;
}

/**
 * Superfície de check-in do KR: mostra quando foi o último check-in e um
 * "streak simples" de períodos consecutivos. Read-only; a frequência vem de
 * `useOkrSettings` (query já cacheada — sem query pesada nova).
 */
export function CheckinStreak({ checkins, lastCheckinAt, className }: CheckinStreakProps) {
  const { data: settings } = useOkrSettings();
  const frequency = settings?.checkin_frequency || "weekly";

  const last = lastCheckinAt ?? checkins[0]?.created_at ?? null;
  if (!last) return null;

  const streak = computeCheckinStreak(checkins, frequency);
  const period = PERIOD_LABELS[frequency] ?? PERIOD_LABELS.weekly;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3 shrink-0" />
        Último check-in {formatDistanceToNow(new Date(last), { addSuffix: true, locale: ptBR })}
      </span>
      {streak >= 2 && (
        <span
          className="flex items-center gap-1 font-medium text-primary"
          title={`Sequência de ${streak} ${period.many} com check-in`}
        >
          <Flame className="h-3 w-3 shrink-0" />
          {streak} {period.many} {period.adj}
        </span>
      )}
    </div>
  );
}
