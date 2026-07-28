import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, EyeOff, MessageSquare } from "lucide-react";
import { PulseScale1to5 } from "./PulseScale1to5";
import { PulseEnps } from "./PulseEnps";
import { PulseMoodEmoji } from "./PulseMoodEmoji";
import type { PendingPulse } from "@/hooks/usePendingPulse";
import { useSubmitPulseResponse } from "@/hooks/useSubmitPulseResponse";

interface PulseQuestionProps {
  pulse: PendingPulse;
  onComplete?: () => void;
  className?: string;
}

export function PulseQuestion({ pulse, onComplete, className }: PulseQuestionProps) {
  const submit = useSubmitPulseResponse();
  const [score, setScore] = useState<number | null>(null);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const requiresComment =
    pulse.question_type !== "mood_emoji" &&
    pulse.require_comment_below !== null &&
    score !== null &&
    score <= pulse.require_comment_below;

  // Se já existe resposta desta pessoa no período (unique violation), tratamos
  // como concluído: fecha o card com a confirmação em vez de deixar a pessoa
  // clicando de novo sem feedback.
  const alreadyAnswered = (err: unknown) => {
    const msg = (err as Error)?.message ?? "";
    return msg.includes("duplicate key") || msg.includes("unique");
  };

  const handleSubmit = async () => {
    if (score === null) return;
    if (requiresComment && !comment.trim()) return;

    try {
      await submit.mutateAsync({
        pulseSurveyId: pulse.id,
        periodStart: pulse.period_start,
        anonymous: pulse.anonymous,
        questionType: pulse.question_type,
        score,
        emoji: emoji ?? undefined,
        comment: comment.trim() ? comment : null,
      });
      onComplete?.();
    } catch (err) {
      if (alreadyAnswered(err)) onComplete?.();
      // demais erros: o toast do hook informa e o form permanece p/ nova tentativa
    }
  };

  const handleMoodSelect = async (selectedScore: number, selectedEmoji: string) => {
    // Mood é 1-clique: submete imediatamente
    setScore(selectedScore);
    setEmoji(selectedEmoji);
    try {
      await submit.mutateAsync({
        pulseSurveyId: pulse.id,
        periodStart: pulse.period_start,
        anonymous: pulse.anonymous,
        questionType: pulse.question_type,
        score: selectedScore,
        emoji: selectedEmoji,
      });
      onComplete?.();
    } catch (err) {
      if (alreadyAnswered(err)) onComplete?.();
    }
  };

  const isPending = submit.isPending;

  return (
    <div className={className}>
      {pulse.anonymous && (
        <Badge variant="secondary" className="mb-2 gap-1.5">
          <EyeOff className="h-3 w-3" />
          Anônimo
        </Badge>
      )}
      <p className="mb-4 text-base font-medium leading-snug">{pulse.question}</p>

      {pulse.question_type === "scale_1_5" && (
        <PulseScale1to5 selected={score} onSelect={setScore} disabled={isPending} />
      )}
      {pulse.question_type === "enps_0_10" && (
        <PulseEnps selected={score} onSelect={setScore} disabled={isPending} />
      )}
      {pulse.question_type === "mood_emoji" && (
        <PulseMoodEmoji selected={score} onSelect={handleMoodSelect} disabled={isPending} />
      )}

      {pulse.question_type !== "mood_emoji" && requiresComment && (
        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            Conte mais (obrigatório)
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="O que está acontecendo?"
            className="min-h-[60px]"
            disabled={isPending}
          />
        </div>
      )}

      {pulse.question_type !== "mood_emoji" && score !== null && (
        <div className="mt-4 flex items-center justify-end gap-2">
          {requiresComment && !comment.trim() && (
            <span className="text-xs text-muted-foreground">Comentário obrigatório</span>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || (requiresComment && !comment.trim())}
            aria-busy={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Enviando…" : "Enviar resposta"}
          </Button>
        </div>
      )}
    </div>
  );
}
