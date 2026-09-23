/**
 * A nota final de uma pessoa no ciclo, depois da calibragem.
 *
 * A calibragem acontece atitude por atitude: o comitê olha a autoavaliação e a
 * nota do líder e decide a nota daquela atitude. A nota final é a média das 12.
 *
 * Onde o comitê não calibrou, vale a média entre autoavaliação e líder — foi o
 * consenso que as duas partes já tinham. Ignorar a atitude não calibrada faria
 * a nota final de quem teve 3 atitudes discutidas sair de uma base diferente de
 * quem teve 12, e as duas apareceriam lado a lado como se fossem comparáveis.
 */

import { ATTITUDES } from "./attitudes";

export interface LinhaCalibragem {
  questionId: string;
  selfScore: number | null;
  leaderScore: number | null;
  calibrado: number | null;
}

export interface NotaFinal {
  /** Média das atitudes, já arredondada para duas casas. */
  score: number;
  /** Quantas atitudes o comitê tocou. */
  calibradas: number;
  /** Quantas caíram no consenso auto/líder. */
  herdadas: number;
  /** Quantas ficaram sem base nenhuma — impedem fechar a nota. */
  semBase: number;
  /** A conta linha a linha, guardada junto da nota para auditoria. */
  detalhe: Array<{
    questionId: string;
    valor: number | null;
    origem: "calibrado" | "consenso" | "sem base";
  }>;
}

/** O valor que cada atitude contribui, e de onde ele veio. */
function valorDaLinha(l: LinhaCalibragem): { valor: number | null; origem: NotaFinal["detalhe"][number]["origem"] } {
  if (typeof l.calibrado === "number") return { valor: l.calibrado, origem: "calibrado" };
  if (typeof l.selfScore === "number" && typeof l.leaderScore === "number") {
    return { valor: (l.selfScore + l.leaderScore) / 2, origem: "consenso" };
  }
  return { valor: null, origem: "sem base" };
}

export function calcularNotaFinal(linhas: LinhaCalibragem[]): NotaFinal {
  const detalhe = linhas.map((l) => ({ questionId: l.questionId, ...valorDaLinha(l) }));
  const validos = detalhe.filter((d) => d.valor !== null).map((d) => d.valor as number);

  return {
    score: validos.length ? Number((validos.reduce((a, b) => a + b, 0) / validos.length).toFixed(2)) : 0,
    calibradas: detalhe.filter((d) => d.origem === "calibrado").length,
    herdadas: detalhe.filter((d) => d.origem === "consenso").length,
    semBase: detalhe.filter((d) => d.origem === "sem base").length,
    detalhe,
  };
}

/**
 * Dá para publicar esta nota?
 *
 * Atitude sem base nenhuma não é detalhe: significa que ninguém respondeu
 * aquela parte da avaliação, e publicar assim entrega à pessoa um número que
 * não mede o que diz medir.
 */
export function podePublicar(nota: NotaFinal, totalEsperado = ATTITUDES.length): {
  ok: boolean;
  motivo: string | null;
} {
  if (nota.detalhe.length < totalEsperado) {
    return { ok: false, motivo: `A avaliação tem ${nota.detalhe.length} de ${totalEsperado} atitudes.` };
  }
  if (nota.semBase > 0) {
    return {
      ok: false,
      motivo: `${nota.semBase} atitude${nota.semBase > 1 ? "s" : ""} sem autoavaliação nem nota do líder.`,
    };
  }
  return { ok: true, motivo: null };
}

/** Rótulo curto do quanto a nota foi discutida — aparece ao lado dela na lista. */
export function resumoDaOrigem(nota: NotaFinal): string {
  if (nota.calibradas === nota.detalhe.length) return "toda calibrada";
  if (nota.calibradas === 0) return "sem calibragem";
  return `${nota.calibradas} de ${nota.detalhe.length} calibradas`;
}
