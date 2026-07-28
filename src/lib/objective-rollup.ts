import type { ObjectiveWithDetails } from "@/hooks/useObjectives";

/**
 * Rollup de progresso de OKR (§3.4) — fonte ÚNICA de verdade do cálculo.
 *
 * Cálculo CTO-crítico: era duplicado em OkrOverview e ObjectiveTreeNode; se as
 * cópias divergissem, o painel de acompanhamento e a árvore mostrariam números
 * diferentes para o mesmo objetivo. Centralizado aqui para nunca driftar.
 */

export const clampPct = (n: unknown) =>
  Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

/**
 * Resolve o peso de um filho dentro do pai. O peso vem de `objective_relations`.
 * `undefined`/0 sinaliza "sem peso definido" e é tratado pela média ponderada
 * como distribuição igualitária.
 */
export type WeightOf = (childId: string) => number;

/**
 * Média PONDERADA robusta. Usa os pesos quando somam > 0; caso contrário cai
 * para média simples — que equivale à distribuição igualitária que o
 * ObjectiveTreeNode aplica quando os pesos ainda não foram configurados.
 */
export function weightedMean(parts: { value: number; weight: number }[]): number {
  if (!parts.length) return 0;
  const totalW = parts.reduce((s, p) => s + Math.max(0, p.weight), 0);
  if (totalW <= 0) return parts.reduce((s, p) => s + p.value, 0) / parts.length;
  return parts.reduce((s, p) => s + p.value * Math.max(0, p.weight), 0) / totalW;
}

/**
 * ROLLUP (§3.4): progresso REAL e ESPERADO de um objetivo, com barra dupla.
 *
 * Critério de PRESENÇA do backend (resolve o antigo `backend > 0`): o valor
 * `objective.progress` é confiável quando o objetivo POSSUI KRs próprios — é
 * deles que o backend (`cascade_objective_progress`) computa o número, então
 * 0 aqui é um "0% real", não "backend ausente". Usamos o backend direto nesse
 * caso (inclusive quando é 0), em vez de recair em cálculo client-side só
 * porque o valor é 0.
 *
 * Um objetivo SEM KRs próprios é um nó de ROLLUP: seu progresso (e esperado) é
 * a média PONDERADA — por `weight_percentage` dos filhos — do rollup de cada
 * filho, recursivamente. Mesma metodologia do backend, calculada no cliente
 * para não depender de o cascade já ter propagado até a raiz.
 */
export function rollup(
  obj: ObjectiveWithDetails,
  weightOf: WeightOf,
): { progress: number; expected: number } {
  const kids = obj.children ?? [];
  if (kids.length) {
    const parts = kids.map((c) => ({ r: rollup(c, weightOf), w: weightOf(c.id) }));
    return {
      progress: clampPct(weightedMean(parts.map((p) => ({ value: p.r.progress, weight: p.w })))),
      expected: clampPct(weightedMean(parts.map((p) => ({ value: p.r.expected, weight: p.w })))),
    };
  }
  // Folha (com ou sem KRs): backend é a fonte de verdade.
  return { progress: clampPct(obj.progress), expected: clampPct(obj.expected_progress ?? 0) };
}
