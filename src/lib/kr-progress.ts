/**
 * Progresso e formatação de KEY RESULTS — fonte única do cálculo de KR.
 *
 * Distinto do rollup canônico de OBJETIVO (`objective-rollup.ts`): aqui é o
 * progresso de um único KR (respeitando `kr_type` e `direction`), reusado pela
 * lista pessoal, pela hierarquia da empresa e pelo preview ao vivo do check-in.
 */

/** Campos mínimos para calcular o progresso de um KR. */
export interface KrProgressShape {
  target_value: number | string | null;
  initial_value?: number | string | null;
  kr_type?: string | null;
  direction?: string | null;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Progresso (0-100) de um KR para um VALOR arbitrário — a base do preview ao
 * vivo do check-in (antes→depois). Respeita tipo e direção:
 * - `binary`: 100 só ao atingir a meta;
 * - `direction === "down"`: progride conforme o valor cai rumo à meta;
 * - demais: proporcional entre `initial_value` e `target_value`.
 */
export function krProgressForValue(value: number | string | null, kr: KrProgressShape): number {
  const target = Number(kr.target_value ?? 0);
  const initial = Number(kr.initial_value ?? 0);
  const current = Number(value ?? 0);
  if (kr.kr_type === "binary") return current >= target ? 100 : 0;
  if (kr.direction === "down") {
    const span = initial - target;
    if (span === 0) return current <= target ? 100 : 0;
    return clampPct(((initial - current) / span) * 100);
  }
  const span = target - initial;
  if (span === 0) return current >= target ? 100 : 0;
  return clampPct(((current - initial) / span) * 100);
}

/** Progresso (0-100) de um KR pelo seu valor ATUAL. */
export function krProgress(kr: KrProgressShape & { current_value: number | string | null }): number {
  return krProgressForValue(kr.current_value, kr);
}

/**
 * Formata um valor de KR em pt-BR conforme o tipo: `currency` com prefixo R$,
 * `percent` com sufixo %, `numeric` com a unidade (quando houver). `binary`
 * é tratado pela UI (Concluído/Não), não por aqui.
 */
export function formatKrValue(
  value: number | string | null,
  kr_type?: string | null,
  unit?: string | null,
): string {
  const n = Number(value ?? 0);
  const num = n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  if (kr_type === "currency") return `R$ ${num}`;
  if (kr_type === "percent") return `${num}%`;
  return unit ? `${num} ${unit}` : num;
}
