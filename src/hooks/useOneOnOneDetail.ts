import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OneOnOneRow } from "@/hooks/useOneOnOnes";

/** Usuário embutido (líder/liderado) no mesmo formato exposto por `OneOnOneRow`. */
type OneOnOneUser = OneOnOneRow["leader"];

export const ONE_ON_ONE_DETAIL_KEY = "one-on-one";

/**
 * Projeção da 1:1 com líder/liderado embutidos — idêntica à da listagem
 * (`useOneOnOnes`) para reaproveitar o cache/rota.
 */
const ONE_ON_ONE_SELECT = `
  id, company_id, leader_id, member_id, scheduled_at, duration_minutes,
  location, status, recurrence, recurrence_parent_id, completed_at,
  canceled_reason, created_at, updated_at,
  leader:users!one_on_ones_leader_id_fkey(id, full_name, avatar_url),
  member:users!one_on_ones_member_id_fkey(id, full_name, avatar_url)
`;

/** Normaliza a relação embutida (objeto ou array de um) para um único usuário. */
function pickUser(rel: unknown): OneOnOneUser {
  const value = Array.isArray(rel) ? rel[0] : rel;
  if (!value || typeof value !== "object") return null;
  const user = value as Record<string, unknown>;
  return {
    id: user.id as string,
    full_name: (user.full_name as string | null) ?? null,
    avatar_url: (user.avatar_url as string | null) ?? null,
  };
}

/** Converte a linha bruta do Supabase em `OneOnOneRow` sem `as unknown as`. */
function mapRow(row: Record<string, unknown>): OneOnOneRow {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    leader_id: row.leader_id as string,
    member_id: row.member_id as string,
    scheduled_at: row.scheduled_at as string,
    duration_minutes: row.duration_minutes as number,
    location: (row.location as string | null) ?? null,
    status: row.status as OneOnOneRow["status"],
    recurrence: row.recurrence as OneOnOneRow["recurrence"],
    recurrence_parent_id: (row.recurrence_parent_id as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    canceled_reason: (row.canceled_reason as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    leader: pickUser(row.leader),
    member: pickUser(row.member),
  };
}

/**
 * Carrega uma 1:1 individual (com líder/liderado embutidos) por id.
 *
 * Extraído da query Supabase inline que vivia dentro de `OneOnOneDetail` —
 * segue o padrão dos demais hooks (`useQuery` com loading/erro/refetch) e
 * tipa o resultado sem `as unknown as`. Retorna `null` (com sucesso) quando a
 * 1:1 não existe ou o usuário não tem acesso; erros de rede/backend propagam
 * via `isError` para a página tratar com `<QueryError>`.
 */
export function useOneOnOneDetail(id: string | undefined) {
  return useQuery({
    queryKey: [ONE_ON_ONE_DETAIL_KEY, id],
    queryFn: async (): Promise<OneOnOneRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("one_on_ones")
        .select(ONE_ON_ONE_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapRow(data);
    },
    enabled: !!id,
  });
}
