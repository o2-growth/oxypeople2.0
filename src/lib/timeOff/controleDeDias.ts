import { differenceInCalendarDays, parseISO } from "date-fns";
import { lastTakenEnd, nextScheduledStart, type TimeOffLite } from "./alerts";

/**
 * Controle de dias de suspensão de contrato.
 *
 * Não há teto: a O2 não define um número de dias por ano, então nada aqui
 * calcula saldo nem marca estouro. O que o RH precisa ver é o oposto — quem
 * está há tempo demais sem se afastar, que é invisível numa lista de registros
 * ordenada por data.
 */

/** Registro com a quantidade de dias, para somar. */
export interface RegistroLite extends TimeOffLite {
  days: number;
}

export interface ControleDeDias {
  /** Dias somados nos afastamentos que já aconteceram, na janela pedida. */
  diasNaJanela: number;
  /** Dias somados em toda a série, sem recorte. */
  diasNoTotal: number;
  /** Fim do último afastamento (ISO) ou null se nunca se afastou. */
  ultimoAfastamento: string | null;
  /** Dias desde o fim do último afastamento; null se nunca se afastou. */
  diasSemAfastar: number | null;
  /** Início da próxima ausência agendada (ISO) ou null. */
  proximoAgendado: string | null;
  /** Quantos registros a pessoa tem na janela. */
  registrosNaJanela: number;
}

/** Status que contam como afastamento já ocorrido — o mesmo critério do alerta. */
const JA_ACONTECEU = new Set(["realizada", "arquivada", "em_andamento"]);

/**
 * Calcula o quadro de uma pessoa.
 *
 * A janela filtra pelo início do afastamento, não pelo fim: um período que
 * começou antes da janela e terminou dentro dela foi decidido no ciclo
 * anterior, e contá-lo aqui inflaria o mês em que a pessoa voltou.
 */
export function calcularControle(
  registros: RegistroLite[],
  janelaDias: number,
  hoje: Date,
): ControleDeDias {
  const passados = registros.filter((r) => JA_ACONTECEU.has(r.status));

  const naJanela = passados.filter(
    (r) => differenceInCalendarDays(hoje, parseISO(r.start_date)) <= janelaDias,
  );

  const fim = lastTakenEnd(passados);

  return {
    diasNaJanela: naJanela.reduce((acc, r) => acc + (r.days ?? 0), 0),
    diasNoTotal: passados.reduce((acc, r) => acc + (r.days ?? 0), 0),
    ultimoAfastamento: fim,
    // Um afastamento em curso termina no futuro: o "sem afastar" seria
    // negativo, e a pessoa está descansando justamente agora.
    diasSemAfastar: fim ? Math.max(0, differenceInCalendarDays(hoje, parseISO(fim))) : null,
    proximoAgendado: nextScheduledStart(registros, hoje),
    registrosNaJanela: naJanela.length,
  };
}

/**
 * Ordena para o RH: primeiro quem está há mais tempo sem se afastar, com quem
 * nunca se afastou no topo. É a lista de quem precisa de atenção, não um
 * ranking de quem tirou mais.
 */
export function ordenarPorUrgencia<T extends { controle: ControleDeDias; nome: string }>(
  linhas: T[],
): T[] {
  return [...linhas].sort((a, b) => {
    const da = a.controle.diasSemAfastar;
    const db = b.controle.diasSemAfastar;
    if (da === null && db === null) return a.nome.localeCompare(b.nome, "pt-BR");
    if (da === null) return -1;
    if (db === null) return 1;
    if (da !== db) return db - da;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}
