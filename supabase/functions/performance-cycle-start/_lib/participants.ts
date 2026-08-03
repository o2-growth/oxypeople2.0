/**
 * Quem avalia quem, por tipo de ciclo.
 *
 * O tipo do ciclo é o contrato com o usuário — o texto que ele lê ao criar
 * ("Autoavaliação + Gestor + Calibragem", "360°: Gestor + Pares + Auto +
 * Liderados"). Esta função é a tradução literal desse texto em pares
 * avaliador→avaliado, e é o núcleo do que o "Iniciar Ciclo" produz.
 */

export type CycleType = "full" | "pocket" | "self" | "180" | "360" | "leader" | "custom";

export interface Participant {
  userId: string;
  managerId: string | null;
  teamIds: string[];
}

export interface EvaluationPair {
  evaluatorId: string;
  evaluatedId: string;
  /** self | manager | peer | direct_report */
  relationship: string;
}

/** Limita quantos pares cada pessoa avalia num 360 — senão vira trabalho impossível. */
export const MAX_PEERS = 3;

function addPair(
  out: EvaluationPair[],
  seen: Set<string>,
  evaluatorId: string,
  evaluatedId: string,
  relationship: string,
) {
  // Uma pessoa não é par de si mesma, e o mesmo par não se repete.
  if (evaluatorId === evaluatedId && relationship !== "self") return;
  const chave = `${evaluatorId}|${evaluatedId}|${relationship}`;
  if (seen.has(chave)) return;
  seen.add(chave);
  out.push({ evaluatorId, evaluatedId, relationship });
}

/**
 * Monta os pares de avaliação.
 *
 * `participants` são as pessoas no escopo do ciclo. O gestor entra como
 * avaliador mesmo que esteja fora do escopo — do contrário um ciclo restrito a
 * um departamento não teria quem avaliasse ninguém.
 */
export function buildEvaluationPairs(
  participants: Participant[],
  type: CycleType,
): EvaluationPair[] {
  const out: EvaluationPair[] = [];
  const seen = new Set<string>();
  const noEscopo = new Set(participants.map((p) => p.userId));

  // "Full" é o ciclo completo de mão dupla: a pessoa se avalia, avalia quem a
  // lidera, e é avaliada pelo gestor. O 180 fica sendo o corte de mão única
  // (auto + gestor), que é o que distingue os dois.
  const querAuto = type === "full" || type === "self" || type === "180" || type === "360";
  const querGestor = type === "full" || type === "pocket" || type === "180" || type === "360";
  const querPares = type === "360";
  const querLiderados = type === "full" || type === "360" || type === "leader";

  for (const p of participants) {
    if (querAuto) addPair(out, seen, p.userId, p.userId, "self");
    if (querGestor && p.managerId) addPair(out, seen, p.managerId, p.userId, "manager");
    // 'leader' e '360': o liderado avalia quem o lidera.
    if (querLiderados && p.managerId) addPair(out, seen, p.userId, p.managerId, "direct_report");
  }

  if (querPares) {
    // Par = quem divide time com a pessoa. Sem time em comum não há par —
    // avaliar alguém com quem não se trabalha não produz sinal útil.
    const porTime = new Map<string, string[]>();
    for (const p of participants) {
      for (const t of p.teamIds) {
        if (!porTime.has(t)) porTime.set(t, []);
        porTime.get(t)!.push(p.userId);
      }
    }
    for (const p of participants) {
      const candidatos = new Set<string>();
      for (const t of p.teamIds) {
        for (const outro of porTime.get(t) ?? []) {
          if (outro !== p.userId && noEscopo.has(outro)) candidatos.add(outro);
        }
      }
      // Ordena para o resultado ser estável entre execuções (sem aleatório).
      for (const alvo of [...candidatos].sort().slice(0, MAX_PEERS)) {
        addPair(out, seen, p.userId, alvo, "peer");
      }
    }
  }

  return out;
}

/** Quem precisa ser avisado: todo mundo que tem ao menos uma avaliação a fazer. */
export function evaluatorsToNotify(pairs: EvaluationPair[]): string[] {
  return [...new Set(pairs.map((p) => p.evaluatorId))].sort();
}
