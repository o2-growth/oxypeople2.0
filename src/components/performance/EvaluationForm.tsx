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
import { Loader2, Check, Star, AlertCircle, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import {
  ATTITUDES, ATTITUDE_SCALE, MIN_COMMENT_LENGTH,
  isAttitudeComplete, completedCount, isComplete, overallScore, attitudeLabel, firstIncomplete,
  type AttitudeAnswers,
} from "@/lib/performance/attitudes";
import { useEvaluationDetail, useSubmitEvaluation, useReopenEvaluation } from "@/hooks/useEvaluationForm";
import { useUser } from "@/hooks/useUser";

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
  const { profile } = useUser();
  const submit = useSubmitEvaluation();
  const reopen = useReopenEvaluation();

  const [answers, setAnswers] = useState<AttitudeAnswers>({});
  const [tentouEnviar, setTentouEnviar] = useState(false);

  // Recarrega o que já foi salvo: abrir um rascunho tem que mostrar o que a
  // pessoa preencheu antes, não um formulário em branco.
  useEffect(() => {
    if (!data) return;
    const catPorId = new Map(data.questions.map((q) => [q.id, q.category]));
    const iniciais: AttitudeAnswers = {};
    for (const a of data.answers) {
      const cat = catPorId.get(a.question_id);
      if (!cat) continue;
      const payload = a.answer as { comment?: string } | null;
      iniciais[cat] = {
        score: typeof a.score === "number" ? a.score : undefined,
        comment: payload?.comment ?? "",
      };
    }
    setAnswers(iniciais);
    setTentouEnviar(false);
  }, [data]);

  const feitas = completedCount(answers);
  const completo = isComplete(answers);
  const nota = useMemo(() => overallScore(answers), [answers]);
  const faltando = firstIncomplete(answers);
  const evaluation = data?.evaluation;
  // O admin, que consegue abrir a avaliação de qualquer pessoa pela lista de
  // acompanhamento, olha sem poder responder no lugar dela — a nota é de quem
  // avalia, não de quem administra.
  const souOAvaliador = !!evaluation && evaluation.evaluator_id === profile?.id;
  const somenteLeitura = evaluation?.status === "completed" || !souOAvaliador;
  const aindaNaoRespondida = !souOAvaliador && evaluation?.status !== "completed";
  // Enviou errado? O próprio avaliador reabre e corrige.
  //
  // A janela é o ciclo estar aberto, não o prazo de resposta. Os dois foram a
  // mesma coisa até 04/09/2026, e o resultado prático foi ninguém conseguir
  // corrigir: o ciclo 02/2026 tem response_deadline em 28/08 — a mesma data em
  // que começou — e vai até 11/09. Cobrar a entrega e permitir consertar um
  // erro são coisas diferentes: entregar atrasado atrapalha o processo, uma
  // nota errada parada no sistema contamina a calibragem e o resultado.
  const prazoResposta = evaluation?.cycle
    ? parseISO(evaluation.cycle.response_deadline ?? evaluation.cycle.end_date)
    : null;
  const dentroDoPrazo = !prazoResposta || !isBefore(prazoResposta, startOfDay(new Date()));
  const cicloAberto = evaluation?.cycle?.status === "active";
  const podeCorrigir =
    souOAvaliador && evaluation?.status === "completed" && (cicloAberto || dentroDoPrazo);

  const setScore = (key: string, score: number) =>
    setAnswers((a) => ({ ...a, [key]: { ...a[key], score } }));
  const setComment = (key: string, comment: string) =>
    setAnswers((a) => ({ ...a, [key]: { ...a[key], comment } }));

  const enviar = (draft: boolean) => {
    if (!draft && !completo) { setTentouEnviar(true); return; }
    if (!evaluation) return;
    submit.mutate(
      { evaluationId: evaluation.id, cycleId: evaluation.cycle_id, answers, draft },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={!!evaluationId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[680px]">
        {isLoading || !evaluation ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-2/3" />
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : (
          <>
            <DialogHeader className="border-b pb-4">
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

              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {feitas} de {ATTITUDES.length} atitudes avaliadas
                  </span>
                  {nota != null && (
                    <Badge variant="secondary">
                      Nota {nota.toFixed(2)} · {attitudeLabel(nota)}
                    </Badge>
                  )}
                </div>
                <Progress value={(feitas / ATTITUDES.length) * 100} className="h-2" />
              </div>
            </DialogHeader>

            {aindaNaoRespondida && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {evaluation.evaluator?.full_name ?? "Quem avalia"} ainda não respondeu.
                  </span>{" "}
                  O que aparece abaixo é o rascunho, se houver. Só quem avalia pode preencher.
                </p>
              </div>
            )}

            {!aindaNaoRespondida && somenteLeitura && !souOAvaliador && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                Respostas de{" "}
                <span className="font-medium text-foreground">
                  {evaluation.evaluator?.full_name ?? "quem avaliou"}
                </span>{" "}
                — somente leitura.
              </div>
            )}

            <div className="space-y-4">
              {ATTITUDES.map((atitude, i) => {
                const resposta = answers[atitude.key];
                const pronta = isAttitudeComplete(resposta);
                const pendente = tentouEnviar && !pronta;

                return (
                  <div
                    key={atitude.key}
                    className={cn(
                      "rounded-lg border p-4",
                      pendente && "border-destructive/50 bg-destructive/5",
                      pronta && "border-emerald-500/30",
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {i + 1}/{ATTITUDES.length}
                      </span>
                      <h3 className="text-base font-semibold">{atitude.label}</h3>
                      {pronta && <Check className="h-4 w-4 text-emerald-500" />}
                    </div>

                    {/* Os três níveis descritos: é o critério que a pessoa lê
                        antes de pontuar, como na avaliação anterior. */}
                    <div className="mb-3 space-y-1 text-sm text-muted-foreground">
                      <p><strong className="text-foreground/70">Entrega Limitada:</strong> {atitude.limited}</p>
                      <p><strong className="text-foreground/70">Entrega:</strong> {atitude.meets}</p>
                      <p><strong className="text-foreground/70">Entrega e é Referência:</strong> {atitude.reference}</p>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                        Entrega Limitada
                      </span>
                      <div className="flex flex-1 justify-center gap-2">
                        {ATTITUDE_SCALE.map((s) => {
                          const escolhido = resposta?.score === s.value;
                          return (
                            <button
                              key={s.value}
                              type="button"
                              disabled={somenteLeitura}
                              title={s.label}
                              aria-label={s.label}
                              aria-pressed={escolhido}
                              onClick={() => setScore(atitude.key, s.value)}
                              className={cn(
                                "flex h-12 w-14 items-center justify-center rounded-lg border transition",
                                "hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60",
                                escolhido && "border-primary bg-primary/10",
                              )}
                            >
                              <Star
                                className={cn(
                                  "h-5 w-5",
                                  escolhido ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
                                )}
                              />
                            </button>
                          );
                        })}
                      </div>
                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                        Entrega e é Referência
                      </span>
                    </div>
                    {/* Em tela estreita os polos não cabem nas laterais. */}
                    <div className="mt-1 flex justify-between text-[11px] text-muted-foreground sm:hidden">
                      <span>Entrega Limitada</span>
                      <span>É Referência</span>
                    </div>

                    <div className="mt-3">
                      <label className="mb-1 block text-sm font-medium">
                        Comentário <span className="text-destructive">*</span>
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          mínimo {MIN_COMMENT_LENGTH} caracteres
                        </span>
                      </label>
                      <Textarea
                        rows={3}
                        disabled={somenteLeitura}
                        value={resposta?.comment ?? ""}
                        onChange={(e) => setComment(atitude.key, e.target.value)}
                        placeholder="Justifique a nota com um exemplo concreto"
                        className="resize-none"
                      />
                      {pendente && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {typeof resposta?.score !== "number"
                            ? "Escolha uma nota"
                            : "Escreva o comentário"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="sticky bottom-0 -mx-6 -mb-6 gap-2 border-t bg-background px-6 py-4 sm:justify-between">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              {podeCorrigir && (
                <Button
                  variant="outline"
                  disabled={reopen.isPending}
                  onClick={() => reopen.mutate(evaluation.id)}
                >
                  {reopen.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Undo2 className="mr-2 h-4 w-4" />
                  )}
                  Corrigir avaliação
                </Button>
              )}
              {!somenteLeitura && (
                <div className="flex items-center gap-2">
                  {tentouEnviar && faltando && (
                    <span className="hidden text-xs text-destructive sm:block">
                      Falta: {faltando.label}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    disabled={submit.isPending || feitas === 0}
                    onClick={() => enviar(true)}
                  >
                    Salvar rascunho
                  </Button>
                  <Button disabled={submit.isPending} onClick={() => enviar(false)}>
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
