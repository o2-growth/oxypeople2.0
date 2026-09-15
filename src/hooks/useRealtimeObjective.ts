import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeObjective(objectiveId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!objectiveId) return;

    const channel = supabase
      .channel(`objective-${objectiveId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "key_results",
          filter: `objective_id=eq.${objectiveId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["objectives"] });
          queryClient.invalidateQueries({ queryKey: ["objectives-filtered"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "okr_checkins",
          filter: `objective_id=eq.${objectiveId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["checkins"] });
          queryClient.invalidateQueries({ queryKey: ["objectives"] });
          queryClient.invalidateQueries({ queryKey: ["objectives-filtered"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [objectiveId, queryClient]);
}

/**
 * Mesma ideia, para as telas de LISTA — sem filtro por objetivo.
 *
 * O hook acima só é montado com um objetivo aberto, então quem está na lista
 * não via mudança nenhuma até dar F5. Foi o que aconteceu em 15/09: um KR
 * excluído no dia anterior continuava na tela de quem estava com a página
 * aberta, e a conclusão natural foi que a exclusão não tinha funcionado.
 *
 * Um canal por sessão, sem filtro: a RLS do Supabase Realtime só entrega a
 * cada pessoa as linhas que ela já poderia ler.
 */
export function useRealtimeOkrList() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidar = () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["objectives-filtered"] });
    };

    const channel = supabase
      .channel("okr-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "key_results" }, invalidar)
      .on("postgres_changes", { event: "*", schema: "public", table: "objectives" }, invalidar)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
