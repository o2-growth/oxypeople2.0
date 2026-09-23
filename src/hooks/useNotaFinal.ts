import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/** Uma pessoa do ciclo, com a nota que sairá (ou já saiu) da calibragem. */
export interface NotaDoCiclo {
  evaluatedId: string;
  /** Prévia calculada agora: calibrado onde houve, consenso onde não houve. */
  score: number | null;
  calibradas: number;
  herdadas: number;
  /** Atitudes sem autoavaliação nem nota do líder — impedem publicar. */
  semBase: number;
  publicada: boolean;
  publishedAt: string | null;
  /** O número congelado na publicação, que pode diferir da prévia se alguém recalibrou depois. */
  scorePublicado: number | null;
}

/**
 * As notas de todo mundo do ciclo, numa chamada.
 *
 * O cálculo mora no banco junto com o de publicação: a nota é resultado de um
 * processo entre pessoas, e a prévia que o líder vê antes de publicar precisa
 * ser exatamente o que será gravado.
 */
export function useNotasDoCiclo(cycleId: string | null) {
  return useQuery({
    queryKey: ["notas-do-ciclo", cycleId],
    enabled: !!cycleId,
    queryFn: async (): Promise<Map<string, NotaDoCiclo>> => {
      if (!cycleId) return new Map();
      const { data, error } = await supabase.rpc("performance_notas_do_ciclo", {
        p_cycle_id: cycleId,
      });
      if (error) throw error;

      return new Map(
        (data ?? []).map((l: Record<string, unknown>) => [
          l.evaluated_id as string,
          {
            evaluatedId: l.evaluated_id as string,
            score: l.score !== null ? Number(l.score) : null,
            calibradas: Number(l.calibradas ?? 0),
            herdadas: Number(l.herdadas ?? 0),
            semBase: Number(l.sem_base ?? 0),
            publicada: !!l.publicada,
            publishedAt: (l.published_at as string) ?? null,
            scorePublicado: l.score_publicado !== null ? Number(l.score_publicado) : null,
          },
        ]),
      );
    },
  });
}

const invalidarTudo = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["notas-do-ciclo"] });
  qc.invalidateQueries({ queryKey: ["calibration-targets"] });
  qc.invalidateQueries({ queryKey: ["minhas-notas-finais"] });
};

/** Fecha a nota de uma pessoa: a partir daqui ela vê o resultado do ciclo. */
export function usePublicarNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cycleId, evaluatedId }: { cycleId: string; evaluatedId: string }) => {
      const { data, error } = await supabase.rpc("performance_publicar_nota", {
        p_cycle_id: cycleId,
        p_evaluated_id: evaluatedId,
      });
      if (error) throw error;
      return data as { score: number; atitudes: number };
    },
    onSuccess: (r) => {
      invalidarTudo(qc);
      toast.success("Nota publicada", {
        description: `Nota final ${Number(r.score).toFixed(2)}. A pessoa já consegue ver o resultado.`,
      });
    },
    onError: (e: Error) => toast.error("Não foi possível publicar", { description: e.message }),
  });
}

/** Tira a nota do ar para corrigir. Fica registrado quem reabriu. */
export function useReabrirNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cycleId, evaluatedId }: { cycleId: string; evaluatedId: string }) => {
      const { error } = await supabase.rpc("performance_reabrir_nota", {
        p_cycle_id: cycleId,
        p_evaluated_id: evaluatedId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidarTudo(qc);
      toast.success("Nota reaberta", {
        description: "O resultado voltou a ficar oculto para a pessoa avaliada.",
      });
    },
    onError: (e: Error) => toast.error("Não foi possível reabrir", { description: e.message }),
  });
}

export interface NotaHistorica {
  id: string;
  cicloNome: string;
  inicio: string | null;
  fim: string | null;
  score: number | null;
  origem: string | null;
  publishedAt: string | null;
}

/**
 * O histórico de notas finais da pessoa, do mais recente ao mais antigo.
 *
 * Inclui o que veio do Feedz: a tabela é a mesma, então a linha do tempo não
 * começa em 2026 para quem já era da casa.
 */
export function useMinhasNotasFinais(userId?: string) {
  const { user } = useAuth();
  const alvo = userId ?? user?.id;

  return useQuery({
    queryKey: ["minhas-notas-finais", alvo],
    enabled: !!alvo,
    queryFn: async (): Promise<NotaHistorica[]> => {
      const { data, error } = await supabase
        .from("performance_reviews")
        .select("id, review_name, period_start, period_end, final_score, source, published_at")
        .eq("user_id", alvo!)
        .order("period_end", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((r) => ({
        id: r.id,
        cicloNome: r.review_name,
        inicio: r.period_start,
        fim: r.period_end,
        score: r.final_score !== null ? Number(r.final_score) : null,
        origem: r.source,
        publishedAt: r.published_at,
      }));
    },
  });
}
