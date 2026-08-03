import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { O2_VALUES, overallScore, type Answers } from "@/lib/performance/values";

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
  cycle: { name: string; end_date: string } | null;
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
          cycle:performance_cycles(name, end_date)
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

interface SubmitInput {
  evaluationId: string;
  cycleId: string;
  answers: Answers;
  comment: string;
  /** Rascunho não fecha a avaliação; só guarda o que já foi preenchido. */
  draft?: boolean;
}

export function useSubmitEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ evaluationId, cycleId, answers, comment, draft = false }: SubmitInput) => {
      // Garante que o ciclo tem as perguntas dos valores da empresa. Ciclos
      // criados antes de existir formulário não têm nenhuma — sem isto, não
      // haveria onde pendurar as respostas.
      const { data: existentes } = await supabase
        .from("performance_questions")
        .select("id, category")
        .eq("cycle_id", cycleId);

      let perguntas = existentes ?? [];
      if (perguntas.length === 0) {
        const novas = O2_VALUES.map((v, i) => ({
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

      const linhas = O2_VALUES
        .filter((v) => typeof answers[v.key] === "number")
        .map((v) => ({
          evaluation_id: evaluationId,
          question_id: idPorCategoria.get(v.key)!,
          score: answers[v.key]!,
          answer: { value: answers[v.key], label: v.label },
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

      // O comentário geral vai como resposta sem pergunta associada; a coluna
      // answer é jsonb, então cabe sem alterar o schema.
      if (comment.trim() && !draft) {
        const primeira = idPorCategoria.get(O2_VALUES[0].key);
        if (primeira) {
          await supabase.from("performance_answers").insert({
            evaluation_id: evaluationId,
            question_id: primeira,
            score: null,
            answer: { type: "comment", text: comment.trim() },
          });
        }
      }

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
