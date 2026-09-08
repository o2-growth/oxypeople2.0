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
  /** Distingue "ainda não medi" de "medi e deu zero" — ver `krIsMeasured`. */
  last_checkin_at?: string | null;
  /** Só para formatar a ajuda do formulário (`krModeHint`). */
  unit?: string | null;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Os quatro comportamentos possíveis de um KR.
 *
 * "Diminuir" carregava dois significados diferentes, e é daí que veio o
 * problema relatado pelo CEO em 04/09/2026: "CAC Modelo atual < R$ 12k" com
 * 10.704 aparecia em 89%, como se estivesse quase lá, quando na verdade estava
 * DENTRO do limite; e "CPMQL Franquia < R$ 100" com 115 aparecia 100% batido
 * estando estourado.
 *
 * - REDUÇÃO tem um ponto de partida pior que a meta (sair de 800 e cair para
 *   500) e mede quanto do caminho já foi andado;
 * - TETO é um limite que não pode ser ultrapassado (CAC < 12k), e não tem
 *   ponto de partida — ninguém "parte" de lugar nenhum rumo a um limite.
 *
 * O sinal do span separa os dois sem campo novo: partida acima da meta só faz
 * sentido como redução, partida igual ou abaixo só faz sentido como teto. Os 21
 * KRs "down" da empresa tinham todos `initial_value = 0`, e a fórmula de
 * redução com partida 0 colapsava em `atual / meta` — exatamente a conta de
 * "aumentar". A direção não tinha efeito nenhum.
 */
export type KrMode = "binary" | "up" | "down" | "ceiling";

export function krMode(kr: KrProgressShape): KrMode {
  if (kr.kr_type === "binary") return "binary";
  if (kr.direction !== "down") return "up";
  return Number(kr.initial_value ?? 0) > Number(kr.target_value ?? 0) ? "down" : "ceiling";
}

/**
 * O KR já foi medido alguma vez?
 *
 * Num KR de teto, valor 0 quase sempre quer dizer "ninguém mediu ainda", não
 * "zerei o churn" — e sem esta distinção os 7 KRs de churn nunca medidos
 * apareceriam como 100% dentro do limite. É a mesma heurística que a visão de
 * CTO já usava para acender o tom da barra, agora com uma casa só.
 */
export function krIsMeasured(
  kr: KrProgressShape & { current_value?: number | string | null },
): boolean {
  return kr.last_checkin_at != null || Number(kr.current_value ?? 0) !== 0;
}

/**
 * Progresso (0-100) de um KR para um VALOR arbitrário — a base do preview ao
 * vivo do check-in (antes→depois). Respeita tipo e direção:
 * - `binary`: crédito parcial proporcional à meta (100 ao atingir) — o dono
 *   registra o avanço do entregável sem ser obrigado ao "100% ou nada";
 * - `ceiling`: dentro do teto é meta batida (100); acima, cai proporcional;
 * - `down`: progride conforme o valor cai rumo à meta;
 * - demais: proporcional entre `initial_value` e `target_value`.
 *
 * Espelha o cálculo do banco (`kr_progress_pct`) — mudanças aqui exigem a
 * migração correspondente.
 */
export function krProgressForValue(value: number | string | null, kr: KrProgressShape): number {
  const target = Number(kr.target_value ?? 0);
  const initial = Number(kr.initial_value ?? 0);
  const current = Number(value ?? 0);

  switch (krMode(kr)) {
    case "binary":
      if (current >= target) return 100;
      if (target === 0) return 0;
      return clampPct((current / target) * 100);

    case "ceiling":
      // Dentro do limite a meta está batida — não existe "89% de um teto".
      if (current <= target) return 100;
      if (target <= 0) return 0;
      // Estourou: quanto do teto ainda cabe no valor de hoje. Gradua sem
      // constante arbitrária — R$ 501 num teto de 460 é 92%, R$ 802 num teto
      // de 500 é 62%. Zerar seco igualaria os dois e derrubaria o objetivo
      // inteiro (os pesos são todos 0, então o rollup é média simples).
      //
      // O teto de 99 é o que mantém "100% ⟺ meta batida" verdadeiro em todos
      // os modos: sem ele, R$ 460,01 arredondaria para 100 e acenderia o
      // check de concluído num KR estourado.
      return Math.min(99, clampPct((target / current) * 100));

    case "down": {
      const span = initial - target;
      if (span === 0) return current <= target ? 100 : 0;
      return clampPct(((initial - current) / span) * 100);
    }

    default: {
      const span = target - initial;
      if (span === 0) return current >= target ? 100 : 0;
      return clampPct(((current - initial) / span) * 100);
    }
  }
}

/**
 * Progresso (0-100) de um KR pelo seu valor ATUAL.
 *
 * KR sem medição nenhuma vale 0 em qualquer modo: inflar para 100 tiraria a
 * pressão do check-in que todo o sistema de "pendente/atrasado" existe para
 * criar. O corte fica aqui e não em `krProgressForValue` porque valor digitado
 * no check-in é medição por definição — quem informa 0 num teto está dizendo
 * que zerou, e isso é 100%.
 */
export function krProgress(
  kr: KrProgressShape & { current_value: number | string | null },
): number {
  if (!krIsMeasured(kr)) return 0;
  return krProgressForValue(kr.current_value, kr);
}

/** Meta batida. Vale para todos os modos, inclusive teto. */
export function krIsMet(
  kr: KrProgressShape & { current_value: number | string | null },
): boolean {
  return krProgress(kr) >= 100;
}

/**
 * Rótulos do seletor de direção — os mesmos nos três diálogos de KR.
 *
 * Eram três textos diferentes ("Aumentar/Diminuir", "Subir/Descer", "Maior é
 * melhor/Menor é melhor") e nenhum dizia o que a conta faz. O CEO abriu o
 * formulário de um KR de teto e não achou o que mexer.
 */
export const DIRECTION_LABELS: Record<string, string> = {
  up: "↑ Atingir pelo menos a meta",
  down: "↓ Ficar no máximo na meta",
};

/**
 * A frase que explica, com os números do próprio formulário, qual conta vai
 * valer. É o que torna o span visível: com partida 0 o KR é teto, com partida
 * acima da meta é redução, e a diferença muda o resultado.
 */
export function krModeHint(kr: KrProgressShape): string | null {
  const fmt = (v: number | string | null) => formatKrValue(v, kr.kr_type, kr.unit);
  switch (krMode(kr)) {
    case "ceiling":
      return `Modo teto: 100% enquanto o valor ficar em até ${fmt(kr.target_value)}. Acima disso o percentual cai e a meta conta como não batida.`;
    case "down":
      return `Modo redução: o progresso mede a queda de ${fmt(kr.initial_value ?? 0)} até ${fmt(kr.target_value)}.`;
    default:
      return null;
  }
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
