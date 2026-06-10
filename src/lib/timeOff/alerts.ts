import { differenceInCalendarMonths, differenceInCalendarDays, parseISO } from "date-fns";

/** Modo de alerta escolhido pelo admin. */
export type AlertMode = "since_hire" | "since_last" | "scheduled";

/** Nível de alerta de uma pessoa quanto a férias/ausências. */
export type AlertLevel = "ok" | "soon" | "overdue";

export interface AlertSettings {
  alert_mode: AlertMode;
  /** A partir de quantos meses sem ausência a pessoa é considerada "atrasada". */
  overdue_months: number;
  /** A partir de quantos meses entra em "próximo de tirar". */
  soon_months: number;
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  alert_mode: "since_hire",
  overdue_months: 12,
  soon_months: 10,
};

/** Registro mínimo de ausência necessário para o cálculo. */
export interface TimeOffLite {
  start_date: string;
  end_date: string;
  status: string;
}

/** Pessoa mínima para o cálculo. */
export interface PersonLite {
  hire_date: string | null;
}

export interface AlertResult {
  level: AlertLevel;
  /** Meses decorridos desde a referência (admissão ou última ausência). null no modo scheduled. */
  monthsElapsed: number | null;
  /** Data de referência usada (ISO) ou null. */
  referenceDate: string | null;
}

const PAST_STATUSES = new Set(["realizada", "arquivada", "em_andamento"]);

/** Quantidade de dias (inclusiva) entre início e fim — 10/10 a 10/10 = 1 dia. */
export function calcDays(startISO: string, endISO: string): number {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  const diff = differenceInCalendarDays(end, start);
  return diff < 0 ? 0 : diff + 1;
}

/** Última ausência efetivamente tirada (maior end_date entre as passadas). */
export function lastTakenEnd(records: TimeOffLite[]): string | null {
  const past = records
    .filter((r) => PAST_STATUSES.has(r.status))
    .map((r) => r.end_date)
    .sort();
  return past.length ? past[past.length - 1] : null;
}

/** Próxima ausência agendada com início >= hoje. */
export function nextScheduledStart(records: TimeOffLite[], now: Date): string | null {
  const upcoming = records
    .filter((r) => r.status === "agendada" && parseISO(r.start_date) >= now)
    .map((r) => r.start_date)
    .sort();
  return upcoming.length ? upcoming[0] : null;
}

/**
 * Calcula o nível de alerta de uma pessoa.
 * - since_hire: meses desde a admissão (zera ao tirar? não — sempre da admissão).
 * - since_last: meses desde a última ausência tirada (cai pra admissão se nunca tirou).
 * - scheduled: olha apenas se há ausência agendada chegando (soon) ou não (overdue).
 */
export function computeAlert(
  person: PersonLite,
  records: TimeOffLite[],
  settings: AlertSettings,
  now: Date,
): AlertResult {
  if (settings.alert_mode === "scheduled") {
    const next = nextScheduledStart(records, now);
    if (!next) return { level: "overdue", monthsElapsed: null, referenceDate: null };
    const monthsUntil = differenceInCalendarMonths(parseISO(next), now);
    return {
      level: monthsUntil <= settings.soon_months ? "soon" : "ok",
      monthsElapsed: null,
      referenceDate: next,
    };
  }

  const reference =
    settings.alert_mode === "since_last"
      ? lastTakenEnd(records) ?? person.hire_date
      : person.hire_date;

  if (!reference) {
    // Sem admissão e sem histórico — não dá pra avaliar.
    return { level: "ok", monthsElapsed: null, referenceDate: null };
  }

  const monthsElapsed = differenceInCalendarMonths(now, parseISO(reference));
  let level: AlertLevel = "ok";
  if (monthsElapsed >= settings.overdue_months) level = "overdue";
  else if (monthsElapsed >= settings.soon_months) level = "soon";

  return { level, monthsElapsed, referenceDate: reference };
}

export const ALERT_LABELS: Record<AlertLevel, string> = {
  ok: "Em dia",
  soon: "Próximo de tirar",
  overdue: "Falta tirar",
};

export const ALERT_MODE_LABELS: Record<AlertMode, string> = {
  since_hire: "Tempo desde a admissão",
  since_last: "Tempo desde a última ausência",
  scheduled: "Por ausências agendadas",
};
