import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  O2_VALUES, SCALE, overallScore, answeredCount, isComplete, scaleLabel, type Answers,
} from "@/lib/performance/values";
import { useEvaluationDetail, useSubmitEvaluation } from "@/hooks/useEvaluationForm";

const RELACAO: Record<string, string> = {
  self: "Autoavaliação",
  manager: "Avaliação do gestor",
  peer: "Avaliação de par",
  direct_report: "Avaliação do gestor",
  subordinate: "Avaliação do gestor",
};

interface EvaluationFormProps {
  evaluationId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function EvaluationForm({ evaluationId, onOpenChange }: EvaluationFormProps) {
  const { data, isLoading } = useEvaluationDetail(evaluationId);
  const submit = useSubmitEvaluation();

  const [answers, setAnswers] = useState<Answers>({});
  const [comment, setComment] = useState("");

  // Recarrega o que já havia sido salvo: abrir um rascunho tem que mostrar o
  // que a pessoa preencheu antes, não um formulário em branco.
  useEffect(() => {
    if (!data) return;
    const porCategoria = new Map(data.questions.map((q) => [q.id, q.category]));
    const iniciais: Answers = {};
    let comentario = "";
    for (const a of data.answers) {
      const cat = porCategoria.get(a.question_id);
      const payload = a.answer as { type?: string; text?: string } | null;
      if (payload?.type === "comment") comentario = payload.text ?? "";
      else if (cat && typeof a.score === "number") iniciais[cat] = a.score;
    }
    setAnswers(iniciais);
    setComment(comentario);
  }, [data]);

  const respondidas = answeredCount(answers);
  const completo = isComplete(answers);
  const nota = useMemo(() => overallScore(answers), [answers]);
  const evaluation = data?.evaluation;
  const somenteLeitura = evaluation?.status === "completed";

  const alvo = evaluation?.relationship === "self"
    ? "você mesmo"
    : evaluation?.evaluated?.full_name ?? "colaborador";

  return (
    <Dialog open={!!evaluationId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        {isLoading || !evaluation ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-2/3" />
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={evaluation.evaluated?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(evaluation.evaluated?.full_name ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate">
                    {RELACAO[evaluation.relationship] ?? "Avaliação"}
                    {evaluation.relationship !== "self" && ` — ${evaluation.evaluated?.full_name}`}
                  </DialogTitle>
                  <DialogDescription>
                    {evaluation.cycle?.name}
                    {evaluation.due_date && ` · prazo ${format(parseISO(evaluation.due_date), "dd/MM/yyyy")}`}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-1 py-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {respondidas} de {O2_VALUES.length} valores avaliados
                </span>
                {nota != null && (
                  <Badge variant="secondary">
                    Nota {nota.toFixed(2)} · {scaleLabel(nota)}
                  </Badge>
                )}
              </div>
              <Progress value={(respondidas / O2_VALUES.length) * 100} className="h-2" />
            </div>

            <div className="space-y-5">
              {O2_VALUES.map((valor) => (
                <div key={valor.key} className="rounded-lg border p-4">
                  <p className="font-medium">{valor.label}</p>
                  <p className="mb-3 mt-0.5 text-sm text-muted-foreground">{valor.description}</p>

                  <div className="grid grid-cols-5 gap-2">
                    {SCALE.map((s) => {
                      const escolhido = answers[valor.key] === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          disabled={somenteLeitura}
                          onClick={() => setAnswers((a) => ({ ...a, [valor.key]: s.value }))}
                          title={s.description}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs transition",
                            "hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60",
                            escolhido && "border-primary bg-primary/10 font-medium text-primary",
                          )}
                        >
                          <span className="text-base font-semibold">{s.value}</span>
                          <span className="leading-tight">{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Comentário {evaluation.relationship === "self" ? "sobre seu período" : "para a pessoa"}
                  <span className="ml-1 font-normal text-muted-foreground">(opcional)</span>
                </label>
                <Textarea
                  rows={4}
                  disabled={somenteLeitura}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={`O que ${alvo === "você mesmo" ? "você" : alvo.split(" ")[0]} fez bem e o que pode evoluir?`}
                  className="resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              {!somenteLeitura && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={submit.isPending || respondidas === 0}
                    onClick={() =>
                      submit.mutate(
                        { evaluationId: evaluation.id, cycleId: evaluation.cycle_id, answers, comment, draft: true },
                        { onSuccess: () => onOpenChange(false) },
                      )
                    }
                  >
                    Salvar rascunho
                  </Button>
                  <Button
                    disabled={!completo || submit.isPending}
                    title={completo ? undefined : "Avalie os cinco valores para enviar"}
                    onClick={() =>
                      submit.mutate(
                        { evaluationId: evaluation.id, cycleId: evaluation.cycle_id, answers, comment },
                        { onSuccess: () => onOpenChange(false) },
                      )
                    }
                  >
                    {submit.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Enviar avaliação
                  </Button>
                </div>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
