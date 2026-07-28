import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { LikertScale } from "./LikertScale";
import { NPSScoreScale } from "./NPSScoreScale";
import { GPTW_CATEGORIES } from "./GPTWQuestions";
import { useSubmitGPTWResponse, GPTWSurvey } from "@/hooks/useGPTWSurveys";
import { Loader2, ChevronLeft, ChevronRight, Award, MessageSquare } from "lucide-react";

interface GPTWResponseDialogProps {
  survey: GPTWSurvey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Steps: 0..6 = Likert categories, 7 = eNPS + comment
const TOTAL_STEPS = GPTW_CATEGORIES.length + 1;

export function GPTWResponseDialog({ survey, open, onOpenChange }: GPTWResponseDialogProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [enpsScore, setEnpsScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const submitResponse = useSubmitGPTWResponse();

  const currentCategory = step < GPTW_CATEGORIES.length ? GPTW_CATEGORIES[step] : null;

  const isStepComplete = () => {
    if (currentCategory) {
      return currentCategory.questions.every((q) => answers[q.id] !== undefined);
    }
    // eNPS step
    return enpsScore !== null;
  };

  const progressPercent = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!survey || enpsScore === null) return;
    await submitResponse.mutateAsync({
      survey_id: survey.id,
      answers,
      enps_score: enpsScore,
      comment: comment.trim() || undefined,
    });
    handleClose();
  };

  const handleClose = () => {
    setStep(0);
    setAnswers({});
    setEnpsScore(null);
    setComment("");
    onOpenChange(false);
  };

  const isLastStep = step === TOTAL_STEPS - 1;

  // Count which question number we're on globally
  let questionOffset = 0;
  for (let i = 0; i < step && i < GPTW_CATEGORIES.length; i++) {
    questionOffset += GPTW_CATEGORIES[i].questions.length;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Pesquisa de Clima GPTW
          </DialogTitle>
          <DialogDescription>
            {currentCategory
              ? `${currentCategory.name} — ${currentCategory.description}`
              : "eNPS — Employee Net Promoter Score"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Etapa {step + 1} de {TOTAL_STEPS}</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="space-y-4 py-2">
          {step === 0 && (
            <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Instruções</p>
              <p>Leia cada afirmação e indique o quanto você concorda ou discorda, considerando sua experiência na empresa.</p>
              <p>Sua resposta é confidencial.</p>
            </div>
          )}

          {currentCategory ? (
            currentCategory.questions.map((q, i) => (
              <LikertScale
                key={q.id}
                questionId={q.id}
                questionText={q.text}
                value={answers[q.id]}
                onChange={handleAnswer}
                index={questionOffset + i + 1}
              />
            ))
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-medium leading-relaxed">
                  Em uma escala de 0 a 10, o quanto você indicaria esta empresa para um amigo trabalhar?
                </Label>
                <NPSScoreScale value={enpsScore} onChange={setEnpsScore} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentário <span className="text-muted-foreground text-sm">(opcional)</span>
                </Label>
                <Textarea
                  placeholder="Conte-nos mais sobre sua experiência..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => (step === 0 ? handleClose() : setStep(step - 1))}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 0 ? "Cancelar" : "Anterior"}
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={!isStepComplete() || submitResponse.isPending}
              className="bg-gradient-primary gap-1"
            >
              {submitResponse.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          ) : (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!isStepComplete()}
              className="gap-1"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
