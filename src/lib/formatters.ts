import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formatadores de data compartilhados (pt-BR).
 *
 * Consolida as cópias locais de `formatDate` espalhadas pelo módulo de
 * feedback (Sent/AboutMe/Detail). Todas parseiam ISO, usam o locale ptBR e
 * caem num fallback seguro (`"—"`) em vez de quebrar com datas inválidas.
 */

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date =
    typeof value === "string"
      ? parseISO(value)
      : value instanceof Date
        ? value
        : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Data curta: `dd MMM yyyy` (ex.: "05 mar 2026"). */
export function formatDate(value: DateInput, fallback = "—"): string {
  const date = toDate(value);
  return date ? format(date, "dd MMM yyyy", { locale: ptBR }) : fallback;
}

/** Data e hora: `dd MMM yyyy 'às' HH:mm`. */
export function formatDateTime(value: DateInput, fallback = "—"): string {
  const date = toDate(value);
  return date ? format(date, "dd MMM yyyy 'às' HH:mm", { locale: ptBR }) : fallback;
}

/** Distância relativa ao agora (ex.: "há 3 dias"). */
export function formatRelative(value: DateInput, fallback = "—"): string {
  const date = toDate(value);
  return date
    ? formatDistanceToNow(date, { locale: ptBR, addSuffix: true })
    : fallback;
}
