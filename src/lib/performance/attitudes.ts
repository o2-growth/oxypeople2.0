/**
 * As 12 atitudes inegociáveis da O2 — o que a avaliação de desempenho mede.
 *
 * Substituem os 5 valores que estavam aqui antes: aqueles vinham dos feedbacks
 * do Feedz (reconhecimento no dia a dia), e não da avaliação formal. O texto de
 * cada nível é o mesmo usado na avaliação anterior da empresa, preservado na
 * íntegra para as notas de ciclos diferentes continuarem comparáveis.
 *
 * A escala tem três degraus, não cinco, e o comentário é obrigatório em cada
 * atitude — sem justificativa a nota não diz nada a quem é avaliado.
 */

export interface Attitude {
  key: string;
  label: string;
  /** O que caracteriza cada degrau. É o que a pessoa lê antes de pontuar. */
  limited: string;
  meets: string;
  reference: string;
}

export const ATTITUDES: Attitude[] = [
  {
    key: "seja_inquieto",
    label: "Seja Inquieto",
    limited: "Não demonstra ambição ou interesse em buscar algo além do básico. Não tem iniciativa para novos projetos ou melhorias.",
    meets: "Demonstra ambição alinhada com o esperado, estabelece metas claras e trabalha para alcançá-las consistentemente.",
    reference: "Supera expectativas com ambição inspiradora, lidera grandes projetos e motiva os outros a sonharem grande também.",
  },
  {
    key: "curta_jornada",
    label: "Curta a Jornada",
    limited: "Enfrenta o trabalho com negatividade, resiste a mudanças.",
    meets: "Aborda o trabalho com alegria moderada, é flexível e aprende com os erros.",
    reference: "Inspira alegria, flexibilidade e aprendizado no time.",
  },
  {
    key: "antes_feito",
    label: "Antes feito do que perfeito",
    limited: "Não consegue entregar resultados nem atender à expectativa mínima.",
    meets: "Entrega resultados no prazo e com qualidade suficiente.",
    reference: "Entrega além do esperado, balanceando velocidade e qualidade.",
  },
  {
    key: "foco_cliente",
    label: "Foco do Cliente",
    limited: "Ignora as preocupações ou opiniões do cliente. Age com foco exclusivo nos processos internos, sem considerar o impacto no cliente.",
    meets: "Escuta o cliente ativamente e busca compreender suas dores e expectativas. Propõe soluções baseadas no entendimento do ponto de vista do cliente.",
    reference: "Atua como representante do cliente na empresa, garantindo que suas necessidades sejam prioridade. Inova para superar expectativas, entregando soluções surpreendentes e impactantes.",
  },
  {
    key: "comunique_se",
    label: "Comunique-se",
    limited: "Não comunica suas ideias ou feedbacks, deixando lacunas na colaboração.",
    meets: "Comunica-se de forma clara e oferece feedbacks úteis no tempo adequado.",
    reference: "É referência na comunicação, oferecendo feedbacks rápidos, inspiradores e estratégicos.",
  },
  {
    key: "empreenda",
    label: "Empreenda",
    limited: "Não demonstra senso de responsabilidade ou iniciativa, agindo de forma passiva.",
    meets: "Age com senso de dono, cumprindo responsabilidades e tomando decisões conscientes.",
    reference: "Inspira a equipe ao demonstrar um compromisso excepcional com resultados e inovação.",
  },
  {
    key: "antecipe_se",
    label: "Antecipe-se",
    limited: "Vai para reuniões ou tarefas sem preparo, causando atrasos ou confusão.",
    meets: "Prepara-se adequadamente para reuniões e se antecipa a questões mais básicas.",
    reference: "Antecipação exemplar, liderando reuniões com insights estratégicos e preparação completa.",
  },
  {
    key: "guiado_por_dados",
    label: "Seja Guiado por Dados",
    limited: "Ignora dados e toma decisões baseadas em suposições ou opiniões pessoais.",
    meets: "Analisa e utiliza dados para tomar decisões informadas regularmente.",
    reference: "É referência em decisões baseadas em dados, criando análises que guiam toda a equipe.",
  },
  {
    key: "liberdade_responsabilidade",
    label: "Liberdade com Responsabilidade",
    limited: "Abusa da liberdade, negligenciando prazos ou compromissos.",
    meets: "Garante autogestão eficiente e cumpre compromissos com responsabilidade.",
    reference: "Inspira outros a equilibrar liberdade e responsabilidade, sendo modelo de autogestão.",
  },
  {
    key: "saia_zona_conforto",
    label: "Saia da Zona de Conforto",
    limited: "Evita tarefas desafiadoras e mantém-se apenas nas suas responsabilidades habituais. Demonstra resistência a mudanças ou novas abordagens.",
    meets: "Aceita desafios quando solicitados e trabalha para superar barreiras. Busca aprender com situações desconfortáveis e aplicar o aprendizado no trabalho.",
    reference: "Lidera iniciativas inovadoras e transforma desafios complexos em oportunidades estratégicas. Serve como inspiração para a equipe, mostrando que o crescimento vem do desconforto.",
  },
  {
    key: "va_ate_o_fim",
    label: "Vá até o fim",
    limited: "Frequentemente deixa tarefas inacabadas ou depende de outros para concluí-las. Desiste diante de dificuldades ou prazos apertados.",
    meets: "Cumpre o que foi proposto, entregando resultados no prazo e com qualidade esperada. Mostra comprometimento com as responsabilidades até a conclusão.",
    reference: "Conduz projetos do início ao fim, garantindo impacto significativo e resultados excepcionais. Antecipadamente identifica obstáculos e encontra soluções inovadoras para garantir a conclusão com excelência.",
  },
  {
    key: "fazer_o_que_precisa",
    label: "Fazer o que precisa ser feito",
    limited: "Se não é seu, não atua e não se responsabiliza.",
    meets: "Age sem vaidade, com humildade e disposição para colocar a mão na massa, independentemente do papel.",
    reference: "Não se esconde atrás de cargos, tarefas ou zonas de conforto. Assume o que é necessário e incentiva a prática.",
  },
];

/** Três degraus, como na avaliação anterior da empresa. */
export const ATTITUDE_SCALE = [
  { value: 1, label: "Entrega Limitada" },
  { value: 2, label: "Entrega" },
  { value: 3, label: "Entrega e é Referência" },
] as const;

export const ATTITUDE_MIN = 1;
export const ATTITUDE_MAX = 3;

/** Comentário mínimo por atitude, igual ao que a avaliação antiga exigia. */
export const MIN_COMMENT_LENGTH = 3;

export interface AttitudeAnswer {
  score?: number;
  comment?: string;
}

export type AttitudeAnswers = Record<string, AttitudeAnswer | undefined>;

/** Uma atitude só está completa com nota E comentário. */
export function isAttitudeComplete(a: AttitudeAnswer | undefined): boolean {
  return (
    typeof a?.score === "number" &&
    a.score >= ATTITUDE_MIN &&
    a.score <= ATTITUDE_MAX &&
    (a.comment?.trim().length ?? 0) >= MIN_COMMENT_LENGTH
  );
}

export function completedCount(answers: AttitudeAnswers, lista: Attitude[] = ATTITUDES): number {
  return lista.filter((a) => isAttitudeComplete(answers[a.key])).length;
}

export function isComplete(answers: AttitudeAnswers, lista: Attitude[] = ATTITUDES): boolean {
  return completedCount(answers, lista) === lista.length;
}

/**
 * Nota final: média das notas na escala de 1 a 3.
 *
 * Só sai com tudo respondido — média parcial exibida como final enganaria.
 * Média simples porque nenhuma atitude é "mais inegociável" que outra.
 */
export function overallScore(answers: AttitudeAnswers, lista: Attitude[] = ATTITUDES): number | null {
  const notas = lista
    .map((a) => answers[a.key]?.score)
    .filter((n): n is number => typeof n === "number");
  if (notas.length !== lista.length) return null;
  return Number((notas.reduce((x, y) => x + y, 0) / notas.length).toFixed(2));
}

/** Rótulo da escala para uma nota, aceitando média fracionária. */
export function attitudeLabel(score: number | null | undefined): string | null {
  if (score == null || Number.isNaN(score)) return null;
  const passo = Math.min(ATTITUDE_MAX, Math.max(ATTITUDE_MIN, Math.round(score)));
  return ATTITUDE_SCALE.find((s) => s.value === passo)?.label ?? null;
}

/** Qual atitude ainda falta — alimenta a mensagem do botão de envio. */
export function firstIncomplete(
  answers: AttitudeAnswers,
  lista: Attitude[] = ATTITUDES,
): Attitude | null {
  return lista.find((a) => !isAttitudeComplete(answers[a.key])) ?? null;
}
