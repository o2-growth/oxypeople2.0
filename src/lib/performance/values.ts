/**
 * Valores da O2 — a base da avaliação de desempenho.
 *
 * Vieram do backup do Feedz, onde cada feedback era pontuado de 1 a 5 em cada
 * valor. O backup tem duas gerações: a atual aparece em 104 feedbacks, a
 * anterior em 6. Mantemos as duas porque o histórico importado usa a antiga —
 * exibir "Foco na evolução" como valor desconhecido apagaria o passado.
 */

export interface CompanyValue {
  key: string;
  label: string;
  description: string;
}

/** Geração em uso. Novos ciclos são montados sobre estes. */
export const O2_VALUES: CompanyValue[] = [
  {
    key: "mapa_bussola",
    label: "Com mapa e bússola",
    description: "Planeja com clareza, sabe onde quer chegar e ajusta a rota quando o cenário muda.",
  },
  {
    key: "alimente_jornada",
    label: "Alimente sua jornada",
    description: "Busca aprender e evoluir de forma constante, e leva esse aprendizado para o time.",
  },
  {
    key: "espirito_jovem",
    label: "Mantenha o espírito jovem",
    description: "Encara o novo com curiosidade, questiona o que está posto e propõe caminhos melhores.",
  },
  {
    key: "aventuras_alma",
    label: "Abrace aventuras com alma",
    description: "Assume desafios de verdade e se compromete com o resultado até o fim.",
  },
  {
    key: "pessoas_veia",
    label: "Pessoas na veia",
    description: "Cuida das pessoas ao redor, colabora e constrói relações de confiança.",
  },
];

/** Geração anterior — só para ler o histórico importado do Feedz. */
export const O2_VALUES_LEGACY: CompanyValue[] = [
  { key: "pessoas_na_veia_legacy", label: "Pessoas na Veia", description: "" },
  { key: "para_respira_vai", label: "Para, respira e vai", description: "" },
  { key: "foco_evolucao", label: "Foco na evolução", description: "" },
  { key: "espirito_jovem_legacy", label: "Mantenha esse espírito, jovem", description: "" },
  { key: "ecossistema", label: "Somos parte de um ecossistema", description: "" },
];

/** Escala 1–5, a mesma do Feedz. */
export const SCALE = [
  { value: 1, label: "Muito abaixo", description: "Não demonstra o valor no dia a dia" },
  { value: 2, label: "Abaixo", description: "Demonstra raramente ou de forma inconsistente" },
  { value: 3, label: "Atende", description: "Demonstra o valor de forma consistente" },
  { value: 4, label: "Acima", description: "Demonstra com frequência e influencia o time" },
  { value: 5, label: "Referência", description: "É exemplo do valor para toda a empresa" },
] as const;

export const SCALE_MIN = 1;
export const SCALE_MAX = 5;

export type Answers = Record<string, number | undefined>;

/**
 * Nota final: média simples das notas dadas.
 *
 * Média simples, e não ponderada: os valores da empresa têm o mesmo peso por
 * definição — dizer que um vale mais que outro seria uma decisão de negócio
 * que ninguém tomou.
 *
 * Devolve null enquanto houver valor sem resposta, para não exibir uma média
 * parcial como se fosse a nota final.
 */
export function overallScore(answers: Answers, values: CompanyValue[] = O2_VALUES): number | null {
  const notas = values.map((v) => answers[v.key]).filter((n): n is number => typeof n === "number");
  if (notas.length !== values.length) return null;
  const media = notas.reduce((a, b) => a + b, 0) / notas.length;
  return Number(media.toFixed(2));
}

/** Quantos valores já têm nota — alimenta a barra de progresso do formulário. */
export function answeredCount(answers: Answers, values: CompanyValue[] = O2_VALUES): number {
  return values.filter((v) => typeof answers[v.key] === "number").length;
}

export function isComplete(answers: Answers, values: CompanyValue[] = O2_VALUES): boolean {
  return answeredCount(answers, values) === values.length;
}

/** Rótulo da escala para uma nota, aceitando média fracionária. */
export function scaleLabel(score: number | null | undefined): string | null {
  if (score == null || Number.isNaN(score)) return null;
  const passo = Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(score)));
  return SCALE.find((s) => s.value === passo)?.label ?? null;
}
