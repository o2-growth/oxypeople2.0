import type { ObjectiveWithDetails } from "@/hooks/useObjectives";
import type { Database } from "@/integrations/supabase/types";
import { krProgress } from "./kr-progress";

type KeyResultRow = Database["public"]["Tables"]["key_results"]["Row"];

// Reexporta o cálculo canônico de progresso de KR (home em `kr-progress.ts`)
// para os consumidores desta lib (MyOkrsView/CompanyOkrsList) sem trocar imports.
export { krProgress };

/** Tolerância padrão (dias) entre check-ins quando não há config da empresa. */
export const DEFAULT_CHECKIN_OVERDUE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Objetivo "ativo": não concluído nem cancelado (mesma regra de `useMyDay`). */
export function isObjectiveActive(obj: Pick<ObjectiveWithDetails, "status">): boolean {
  return obj.status !== "completed" && obj.status !== "canceled";
}

/**
 * Um KR é "meu e ativo" quando o objetivo está ativo, o próprio KR não está
 * concluído/cancelado e eu sou o dono. O dono do KR é `owner_user_id`; quando
 * ausente, herda o dono do objetivo — exatamente o critério usado em
 * `useMyDay`/`useTeamPanel`, para que "Meus OKRs" e "Meu Dia" listem os mesmos KRs.
 */
function isMyActiveKr(obj: ObjectiveWithDetails, kr: KeyResultRow, meId: string): boolean {
  if (!isObjectiveActive(obj)) return false;
  if (kr.status === "completed" || kr.status === "canceled") return false;
  const ownerId = kr.owner_user_id ?? obj.owner_id;
  return ownerId === meId;
}

/** O usuário é dono de ao menos um KR ativo? Define o default da aba /objectives. */
export function ownsActiveKr(objectives: ObjectiveWithDetails[], meId: string | null | undefined): boolean {
  if (!meId) return false;
  return objectives.some((o) => (o.key_results ?? []).some((kr) => isMyActiveKr(o, kr, meId)));
}

/** Um KR do usuário + o contexto (objetivo/time) e se está pendente de check-in. */
export interface MyKr {
  kr: KeyResultRow;
  objectiveId: string;
  objectiveTitle: string;
  teamName: string | null;
  /** Nunca teve check-in, ou o último passou da tolerância (`overdueDays`). */
  pending: boolean;
}

/**
 * Lista os KRs do usuário (ativos), marcando os pendentes de check-in e
 * ordenando: pendentes primeiro; dentro de cada grupo, menor progresso antes
 * (quem mais precisa de atenção no topo). `now`/`overdueDays` injetados para o
 * cálculo ser puro e testável.
 */
export function collectMyKrs(
  objectives: ObjectiveWithDetails[],
  meId: string | null | undefined,
  overdueDays: number,
  now: number,
): MyKr[] {
  if (!meId) return [];
  const threshold = now - overdueDays * DAY_MS;
  const items: MyKr[] = [];
  for (const obj of objectives) {
    for (const kr of obj.key_results ?? []) {
      if (!isMyActiveKr(obj, kr, meId)) continue;
      const last = kr.last_checkin_at ? new Date(kr.last_checkin_at).getTime() : null;
      const pending = last === null || last < threshold;
      items.push({
        kr,
        objectiveId: obj.id,
        objectiveTitle: obj.title,
        teamName: obj.team?.name ?? null,
        pending,
      });
    }
  }
  return items.sort((a, b) => {
    if (a.pending !== b.pending) return a.pending ? -1 : 1;
    return krProgress(a.kr) - krProgress(b.kr);
  });
}
