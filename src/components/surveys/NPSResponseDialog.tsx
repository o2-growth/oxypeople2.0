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
import { NPSScoreScale } from "./NPSScoreScale";
import { useSubmitNPSResponse, NPSSurvey } from "@/hooks/useNPSSurveys";
import { Loader2, MessageSquare } from "lucide-react";

interface NPSResponseDialogProps {
  survey: NPSSurvey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NPSResponseDialog({
  survey,
  open,
  onOpenChange,
}: NPSResponseDialogProps) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const submitResponse = useSubmitNPSResponse();

  const requiresComment =
    survey?.require_comment_below !== null &&
    score !== null &&
    score <= (survey?.require_comment_below ?? -1);

  const canSubmit =
    score !== null && (!requiresComment || comment.trim().length > 0);

  const handleSubmit = async () => {
    if (!survey || score === null) return;

    await submitResponse.mutateAsync({
      survey_id: survey.id,
      score,
      comment: comment.trim() || undefined,
    });

    // Reset form
    setScore(null);
    setComment("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setScore(null);
    setComment("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Pesquisa e-NPS
          </DialogTitle>
          <DialogDescription>
            Sua resposta é anônima e nos ajuda a melhorar continuamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Question */}
          <div className="space-y-4">
            <Label className="text-base font-medium leading-relaxed">
              {survey?.question ||
                "Em uma escala de 0 a 10, o quanto você recomendaria esta empresa como um bom lugar para trabalhar?"}
            </Label>

            <NPSScoreScale value={score} onChange={setScore} />
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comentário
              {requiresComment ? (
                <span className="text-destructive text-sm">(obrigatório para notas até {survey?.require_comment_below})</span>
              ) : (
                <span className="text-muted-foreground text-sm">(opcional)</span>
              )}
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitResponse.isPending}
            className="bg-gradient-primary"
          >
            {submitResponse.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Enviar Resposta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
