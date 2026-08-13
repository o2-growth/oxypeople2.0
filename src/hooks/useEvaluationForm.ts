import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ATTITUDES, overallScore, type AttitudeAnswers } from "@/lib/performance/attitudes";

export interface EvaluationDetail {
  id: string;
  cycle_id: string;
  evaluator_id: string;
  evaluated_id: string;
  relationship: string;
  status: string;
  due_date: string;
  overall_score: number | null;
  evaluated: { id: string; full_name: string | null; avatar_url: string | null } | null;
  /** Quem responde. O admin abre a avaliação de outra pessoa e precisa saber de quem é. */
  evaluator: { id: string; full_name: string | null; avatar_url: string | null } | null;
  cycle: { name: string; end_date: string; response_deadline: string | null } | null;
}

/** Avaliação + respostas já salvas, para abrir o formulário no ponto em que parou. */
export function useEvaluationDetail(evaluationId: string | null) {
  return useQuery({
    queryKey: ["evaluation-detail", evaluationId],
    queryFn: async () => {
      if (!evaluationId) return null;

      const { data: evaluation, error } = await supabase
        .from("performance_evaluations")
        .select(`
          id, cycle_id, evaluator_id, evaluated_id, relationship, status, due_date, overall_score,
          evaluated:users!performance_evaluations_evaluated_id_fkey(id, full_name, avatar_url),
          evaluator:users!performance_evaluations_evaluator_id_fkey(id, full_name, avatar_url),
          cycle:performance_cycles(name, end_date, response_deadline)
        `)
        .eq("id", evaluationId)
        .single();
      if (error) throw error;

      // As perguntas do ciclo são a fonte da verdade; os valores em código são
      // o fallback para ciclo que ainda não tem pergunta cadastrada.
      const { data: questions } = await supabase
        .from("performance_questions")
        .select("id, question_text, category, order_index, required")
        .eq("cycle_id", (evaluation as unknown as EvaluationDetail).cycle_id)
        .order("order_index");

      const { data: answers } = await supabase
        .from("performance_answers")
        .select("question_id, score, answer")
        .eq("evaluation_id", evaluationId);

      return {
        evaluation: evaluation as unknown as EvaluationDetail,
        questions: questions ?? [],
        answers: answers ?? [],
      };
    },
    enabled: !!evaluationId,
  });
}

/**
 * Reabre uma avaliação já enviada para o avaliador corrigir e reenviar.
 * As respostas ficam como estão — quem corrige edita em cima do que enviou,
 * não redigita tudo. A RLS já garante que só o próprio avaliador consegue
 * este update; o prazo de resposta é verificado por quem mostra o botão.
 */
export function useReopenEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (evaluationId: string) => {
      const { error } = await supabase
        .from("performance_evaluations")
        .update({ status: "in_progress", completed_at: null })
        .eq("id", evaluationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["evaluation-detail"] });
      queryClient.invalidateQueries({ queryKey: ["performance-cycles"] });
      toast.success("Avaliação reaberta", {
        description: "Corrija o que precisar e envie de novo.",
      });
    },
    onError: (e: Error) => toast.error("Erro ao reabrir a avaliação", { description: e.message }),
  });
}

interface SubmitInput {
  evaluationId: string;
  cycleId: string;
  answers: AttitudeAnswers;
  /** Rascunho não fecha a avaliação; só guarda o que já foi preenchido. */
  draft?: boolean;
}

export function useSubmitEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ evaluationId, cycleId, answers, draft = false }: SubmitInput) => {
      // Garante que o ciclo tem as perguntas dos valores da empresa. Ciclos
      // criados antes de existir formulário não têm nenhuma — sem isto, não
      // haveria onde pendurar as respostas.
      const { data: existentes } = await supabase
        .from("performance_questions")
        .select("id, category")
        .eq("cycle_id", cycleId);

      // Ciclo antigo pode ter as perguntas dos 5 valores; as 12 atitudes são
      // outro conjunto, então a checagem é por chave e não só por quantidade.
      const chaves = new Set(ATTITUDES.map((a) => a.key));
      const jaTemAtitudes = (existentes ?? []).some((q) => chaves.has(q.category ?? ""));

      let perguntas = jaTemAtitudes ? existentes ?? [] : [];
      if (perguntas.length === 0) {
        const novas = ATTITUDES.map((v, i) => ({
          cycle_id: cycleId,
          question_text: v.label,
          category: v.key,
          question_type: "rating" as const,
          order_index: i,
          required: true,
        }));
        const { data, error } = await supabase
          .from("performance_questions")
          .insert(novas)
          .select("id, category");
        if (error) throw error;
        perguntas = data ?? [];
      }

      const idPorCategoria = new Map(perguntas.map((q) => [q.category, q.id]));

      // Upsert manual: apaga as respostas anteriores desta avaliação e regrava.
      // Salvar rascunho várias vezes não pode acumular respostas duplicadas.
      await supabase.from("performance_answers").delete().eq("evaluation_id", evaluationId);

      // Uma linha por atitude, guardando nota e o comentário dela — o
      // comentário é por atitude, não um único no fim.
      const linhas = ATTITUDES
        .filter((v) => typeof answers[v.key]?.score === "number")
        .map((v) => ({
          evaluation_id: evaluationId,
          question_id: idPorCategoria.get(v.key)!,
          score: answers[v.key]!.score!,
          answer: {
            value: answers[v.key]!.score,
            label: v.label,
            comment: answers[v.key]?.comment?.trim() ?? "",
          },
        }))
        .filter((l) => !!l.question_id);

      if (linhas.length) {
        const { error } = await supabase.from("performance_answers").insert(linhas);
        if (error) throw error;
      }

      const score = overallScore(answers);
      const { error: upErr } = await supabase
        .from("performance_evaluations")
        .update({
          status: draft ? "in_progress" : "completed",
          overall_score: score,
          completed_at: draft ? null : new Date().toISOString(),
        })
        .eq("id", evaluationId);
      if (upErr) throw upErr;


      return { score, draft };
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["evaluation-detail"] });
      queryClient.invalidateQueries({ queryKey: ["performance-cycles"] });
      toast.success(
        r.draft ? "Rascunho salvo" : "Avaliação enviada",
        { description: r.draft ? "Você pode continuar depois." : `Nota final: ${r.score?.toFixed(2)}` },
      );
    },
    onError: (e: Error) => toast.error("Erro ao salvar a avaliação", { description: e.message }),
  });
}
