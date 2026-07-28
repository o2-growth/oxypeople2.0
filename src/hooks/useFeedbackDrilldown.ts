import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";

/** Status possíveis de um pedido de feedback (coluna `status`). */
export type FeedbackDrilldownStatus =
  | "requested"
  | "answered"
  | "declined"
  | "expired";

/**
 * Alvo do drilldown exibido no painel lateral.
 * `status = null` significa "sem filtro de status" (ex.: total geral ou
 * recorte por competência) — apenas o rótulo muda.
 */
export interface FeedbackDrilldownTarget {
  status: FeedbackDrilldownStatus | null;
  /** Rótulo já localizado exibido no cabeçalho do painel. */
  label: string;
}

export interface FeedbackDrilldownRow {
  id: string;
  question: string;
  status: string;
  declined_reason: string | null;
  answered_at: string | null;
  created_at: string;
  requester: { full_name: string | null } | null;
  respondent: { full_name: string | null } | null;
}

export const FEEDBACK_DRILLDOWN_KEY = "feedback-drilldown";

type NameRel = { full_name: string | null };

/** Normaliza a relação embedada (objeto ou array de um) para um único nome. */
function pickName(rel: unknown): NameRel | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return (rel[0] as NameRel) ?? null;
  return rel as NameRel;
}

function mapRows(data: Array<Record<string, unknown>>): FeedbackDrilldownRow[] {
  return data.map((row) => ({
    id: row.id as string,
    question: row.question as string,
    status: row.status as string,
    declined_reason: (row.declined_reason as string | null) ?? null,
    answered_at: (row.answered_at as string | null) ?? null,
    created_at: row.created_at as string,
    requester: pickName(row.requester),
    respondent: pickName(row.respondent),
  }));
}

/**
 * Detalhamento (últimos 50) dos pedidos de feedback da empresa dentro do
 * período, opcionalmente filtrado por status. Substitui a query Supabase
 * imperativa que vivia dentro de `FeedbackAnalytics` — segue o padrão
 * `useQuery` (loading/erro/refetch) e tipa o resultado sem `as unknown as`.
 *
 * Passe `target = null` para manter a query desativada (painel fechado).
 */
export function useFeedbackDrilldown(
  target: FeedbackDrilldownTarget | null,
  dateFrom: string,
  dateTo: string,
) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: [
      FEEDBACK_DRILLDOWN_KEY,
      companyId,
      dateFrom,
      dateTo,
      target?.status ?? "all",
    ],
    queryFn: async (): Promise<FeedbackDrilldownRow[]> => {
      if (!companyId) return [];

      let query = supabase
        .from("feedback_requests")
        .select(`
          id, question, status, declined_reason, answered_at, created_at,
          requester:users!feedback_requests_requester_id_fkey(full_name),
          respondent:users!feedback_requests_respondent_id_fkey(full_name)
        `)
        .eq("company_id", companyId)
        .gte("created_at", `${dateFrom}T00:00:00`)
        .lte("created_at", `${dateTo}T23:59:59`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (target?.status) query = query.eq("status", target.status);

      const { data, error } = await query;
      if (error) throw error;
      return mapRows(data ?? []);
    },
    enabled: !!companyId && !!target,
  });
}
