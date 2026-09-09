/**
 * ESPELHO de `src/lib/okr/draft-contract.ts` — não edite só este arquivo.
 *
 * A edge function roda em Deno e não enxerga `src/`, então o contrato vive nos
 * dois lugares. `src/lib/okr/draft-contract.parity.test.ts` compara o corpo dos
 * dois arquivos e quebra na hora em que um deles andar sozinho.
 */

/**
 * De onde saiu cada número. É o campo que separa "o líder disse R$ 500" de
 * "o modelo achou que R$ 500 era razoável" — sem ele, meta inventada entra no
 * sistema com a mesma cara de meta combinada.
 */
export type OrigemDoNumero = "citado" | "inferido" | "ausente";

/** O quanto o modelo confia na extração daquele KR. */
export type Confianca = "alta" | "media" | "baixa";

export interface DraftKeyResult {
  title: string;
  kr_type: "numeric" | "percent" | "currency" | "binary" | "sla_time";
  direction: "up" | "down";
  initial_value: number;
  target_value: number;
  unit: string;
  weight_percentage: number;
  /** Nome citado no texto; o front resolve para id. Null quando ninguém foi citado. */
  owner_nome: string | null;
  origem_do_numero: OrigemDoNumero;
  confianca: Confianca;
  /** Por que este KR ficou assim — aparece no preview, não no banco. */
  racional: string;
}

export interface DraftObjective {
  title: string;
  description: string;
  type: "strategic" | "tactical" | "operational";
  commitment_type: "committed" | "aspirational";
  /** Título do objetivo-pai sugerido; o front resolve para id. */
  parent_titulo: string | null;
}

export interface DraftAviso {
  campo: string;
  texto: string;
  severidade: "alta" | "media" | "baixa";
}

export interface OkrDraft {
  objetivo: DraftObjective;
  key_results: DraftKeyResult[];
  /** O que falta saber. Preenchido quando o modelo se recusa a inventar. */
  perguntas: string[];
  avisos: DraftAviso[];
}

/**
 * JSON Schema enviado à API em `output_config.format`.
 *
 * `additionalProperties: false` em todo objeto e `required` completo: a API só
 * consegue garantir a forma se o schema for fechado.
 */
export const OKR_DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["objetivo", "key_results", "perguntas", "avisos"],
  properties: {
    objetivo: {
      type: "object",
      additionalProperties: false,
      required: ["title", "description", "type", "commitment_type", "parent_titulo"],
      properties: {
        title: { type: "string", description: "Resultado desejado, não tarefa. Sem número no título." },
        description: { type: "string", description: "Uma ou duas frases sobre o que muda se der certo." },
        type: { type: "string", enum: ["strategic", "tactical", "operational"] },
        commitment_type: { type: "string", enum: ["committed", "aspirational"] },
        parent_titulo: {
          type: ["string", "null"],
          description: "Título exato de um objetivo-pai da lista de contexto, ou null.",
        },
      },
    },
    key_results: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title", "kr_type", "direction", "initial_value", "target_value",
          "unit", "weight_percentage", "owner_nome", "origem_do_numero",
          "confianca", "racional",
        ],
        properties: {
          title: { type: "string" },
          kr_type: { type: "string", enum: ["numeric", "percent", "currency", "binary", "sla_time"] },
          direction: {
            type: "string",
            enum: ["up", "down"],
            description:
              "down quando a meta é um limite a não ultrapassar (CAC < 12k) ou uma redução a partir de um ponto de partida.",
          },
          initial_value: {
            type: "number",
            description:
              "Ponto de partida. Em meta de teto deixe 0 — teto não tem partida; em redução, o valor de hoje.",
          },
          target_value: { type: "number" },
          unit: { type: "string", description: "R$, %, min, leads…" },
          weight_percentage: { type: "number", minimum: 0, maximum: 100 },
          owner_nome: { type: ["string", "null"] },
          origem_do_numero: { type: "string", enum: ["citado", "inferido", "ausente"] },
          confianca: { type: "string", enum: ["alta", "media", "baixa"] },
          racional: { type: "string" },
        },
      },
    },
    perguntas: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
      description: "O que você precisaria saber para não ter inferido nada.",
    },
    avisos: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["campo", "texto", "severidade"],
        properties: {
          campo: { type: "string", description: "objetivo | key_results[N]" },
          texto: { type: "string" },
          severidade: { type: "string", enum: ["alta", "media", "baixa"] },
        },
      },
    },
  },
} as const;

const KR_TYPES = ["numeric", "percent", "currency", "binary", "sla_time"];
const ORIGENS = ["citado", "inferido", "ausente"];

/**
 * Segunda barreira: a API garante a forma, isto garante o sentido.
 *
 * Schema válido ainda aceita um KR de teto com ponto de partida acima da meta,
 * que a lib de progresso leria como redução — o erro que custou o dia 08/09.
 */
export function validarProposta(valor: unknown): { ok: boolean; erros: string[] } {
  const erros: string[] = [];
  const d = valor as OkrDraft | null;

  if (!d || typeof d !== "object") return { ok: false, erros: ["Resposta vazia."] };
  if (!d.objetivo?.title?.trim()) erros.push("Objetivo sem título.");
  if (!Array.isArray(d.key_results) || d.key_results.length === 0) {
    erros.push("Nenhum resultado-chave proposto.");
    return { ok: erros.length === 0, erros };
  }

  d.key_results.forEach((kr, i) => {
    const onde = `key_results[${i}]`;
    if (!kr.title?.trim()) erros.push(`${onde}: sem título.`);
    if (!KR_TYPES.includes(kr.kr_type)) erros.push(`${onde}: tipo desconhecido (${kr.kr_type}).`);
    if (kr.direction !== "up" && kr.direction !== "down") erros.push(`${onde}: direção inválida.`);
    if (!Number.isFinite(kr.target_value)) erros.push(`${onde}: meta não é número.`);
    if (!ORIGENS.includes(kr.origem_do_numero)) erros.push(`${onde}: origem do número ausente.`);
    // Teto com partida acima da meta vira "redução" na lib de progresso e passa
    // a medir outra coisa. Se o título diz "<", a partida tem que ser 0.
    if (kr.direction === "down" && /<|abaixo|no máximo|até/i.test(kr.title) && kr.initial_value > kr.target_value) {
      erros.push(`${onde}: meta de teto não pode ter ponto de partida acima do limite.`);
    }
    if (kr.direction === "up" && kr.target_value <= kr.initial_value) {
      erros.push(`${onde}: meta de subida precisa ser maior que o ponto de partida.`);
    }
  });

  const soma = d.key_results.reduce((s, kr) => s + (kr.weight_percentage || 0), 0);
  if (soma !== 0 && soma !== 100) {
    erros.push(`Soma dos pesos precisa ser 0 (sem peso) ou 100 — veio ${soma}.`);
  }

  return { ok: erros.length === 0, erros };
}

/** Um KR já no formato do formulário de criação. */
export interface FormKeyResult {
  title: string;
  targetValue: number;
  currentValue: number;
  initialValue: number;
  unit: string;
  krType: string;
  weightPercentage: number;
  direction: "up" | "down";
}

/**
 * Traduz a proposta para o formulário que já existe.
 *
 * Os nomes citados viram ids aqui, com o que o front sabe — o modelo não recebe
 * id de ninguém e por isso não tem como inventar um.
 */
export function propostaParaFormulario(
  draft: OkrDraft,
  resolver: {
    objetivoPorTitulo: (titulo: string) => string | undefined;
  },
): {
  title: string;
  description: string;
  type: DraftObjective["type"];
  commitmentType: DraftObjective["commitment_type"];
  parentId?: string;
  keyResults: FormKeyResult[];
} {
  return {
    title: draft.objetivo.title,
    description: draft.objetivo.description,
    type: draft.objetivo.type,
    commitmentType: draft.objetivo.commitment_type,
    parentId: draft.objetivo.parent_titulo
      ? resolver.objetivoPorTitulo(draft.objetivo.parent_titulo)
      : undefined,
    keyResults: draft.key_results.map((kr) => ({
      title: kr.title,
      targetValue: kr.target_value,
      currentValue: 0,
      initialValue: kr.initial_value,
      unit: kr.unit,
      krType: kr.kr_type,
      weightPercentage: kr.weight_percentage,
      direction: kr.direction,
    })),
  };
}

/** KRs cujo número o modelo inferiu — o preview destaca estes campos. */
export function camposParaConferir(draft: OkrDraft): number[] {
  return draft.key_results
    .map((kr, i) => (kr.origem_do_numero === "citado" ? -1 : i))
    .filter((i) => i >= 0);
}
