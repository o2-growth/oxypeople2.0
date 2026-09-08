/**
 * Quem ainda pode corrigir uma avaliação já enviada.
 *
 * A regra morava dentro do formulário, e por isso a lista não sabia nada: no
 * histórico do avaliador os cards saíam todos com o nome do ciclo por título —
 * as que ele fez e as que fizeram sobre ele, lado a lado, indistinguíveis. Com
 * 20 cards iguais, achar a avaliação certa virava sorte, e abrir a errada dava
 * a impressão de não ter permissão para corrigir nada.
 */

import { isBefore, parseISO, startOfDay } from "date-fns";

export interface JanelaCiclo {
  status?: string | null;
  end_date?: string | null;
  response_deadline?: string | null;
}

export interface AvaliacaoCorrigivel {
  evaluator_id: string;
  status: string;
  cycle?: JanelaCiclo | null;
}

/** O ciclo ainda está rodando. */
export function cicloAberto(cycle: JanelaCiclo | null | undefined): boolean {
  return cycle?.status === "active";
}

/**
 * O prazo de resposta ainda não passou. Vale o dia inteiro do vencimento.
 * Ciclo sem data nenhuma não tem prazo a cobrar.
 */
export function dentroDoPrazo(cycle: JanelaCiclo | null | undefined): boolean {
  const prazo = cycle?.response_deadline ?? cycle?.end_date;
  if (!prazo) return true;
  return !isBefore(parseISO(prazo), startOfDay(new Date()));
}

/**
 * Enviou errado? O próprio avaliador reabre e corrige.
 *
 * A janela é o ciclo estar aberto, não o prazo de resposta. Os dois foram a
 * mesma coisa até 04/09/2026, e o resultado prático foi ninguém conseguir
 * corrigir: o ciclo 02/2026 tem response_deadline em 28/08 — a mesma data em
 * que começou — e vai até 11/09. Cobrar a entrega e permitir consertar um erro
 * são coisas diferentes: entregar atrasado atrapalha o processo, uma nota
 * errada parada no sistema contamina a calibragem e o resultado do avaliado.
 */
export function podeCorrigirAvaliacao(
  evaluation: AvaliacaoCorrigivel | null | undefined,
  userId: string | null | undefined,
): boolean {
  if (!evaluation || !userId) return false;
  if (evaluation.evaluator_id !== userId) return false;
  if (evaluation.status !== "completed") return false;
  return cicloAberto(evaluation.cycle) || dentroDoPrazo(evaluation.cycle);
}
