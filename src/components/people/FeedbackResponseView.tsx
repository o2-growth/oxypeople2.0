import { OnboardingFeedback } from "@/hooks/useOnboardingFeedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Forward, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FeedbackResponseViewProps {
  feedback: OnboardingFeedback | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onForward?: () => void;
  onExport?: () => void;
}

function RatingDisplay({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-5 w-5",
              (value || 0) >= star
                ? "fill-warning text-warning"
                : "text-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function TextResponse({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm bg-muted/50 p-3 rounded-lg">{value}</p>
    </div>
  );
}

function ChoiceResponse({ label, value }: { label: string; value: string | null }) {
  const displayValue: Record<string, string> = {
    sim_totalmente: "Sim, totalmente",
    sim_em_parte: "Sim, em parte",
    nao_muito: "Não muito",
    nao: "Não",
    sim: "Sim",
    em_parte: "Em parte",
  };

  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <Badge variant="outline">{displayValue[value] || value}</Badge>
    </div>
  );
}

export function FeedbackResponseView({
  feedback,
  open,
  onOpenChange,
  onForward,
  onExport,
}: FeedbackResponseViewProps) {
  if (!feedback) return null;

  const userName = feedback.user?.full_name || "Usuário";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={feedback.user?.avatar_url || undefined} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg">{userName}</DialogTitle>
                <DialogDescription>
                  Respondido em{" "}
                  {feedback.completed_at
                    ? format(new Date(feedback.completed_at), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })
                    : "—"}
                </DialogDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {onExport && (
                <Button variant="outline" size="sm" onClick={onExport}>
                  <Download className="h-4 w-4 mr-1" />
                  Exportar
                </Button>
              )}
              {onForward && (
                <Button variant="outline" size="sm" onClick={onForward}>
                  <Forward className="h-4 w-4 mr-1" />
                  Encaminhar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Seção de Avaliações */}
            <div className="grid grid-cols-2 gap-4">
              <RatingDisplay
                value={feedback.overall_rating}
                label="Avaliação Geral (30 dias)"
              />
              <RatingDisplay
                value={feedback.tools_ease_rating}
                label="Facilidade das Ferramentas"
              />
              <RatingDisplay
                value={feedback.training_rating}
                label="Treinamento/Onboarding"
              />
              <RatingDisplay
                value={feedback.onboarding_rating}
                label="Processo de Integração"
              />
            </div>

            <hr className="border-border" />

            {/* Respostas de Escolha */}
            <div className="grid grid-cols-2 gap-4">
              <ChoiceResponse
                label="Integração com a equipe"
                value={feedback.integration_level}
              />
              <ChoiceResponse
                label="Clareza sobre responsabilidades"
                value={feedback.clarity_level}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Tem todos os acessos?
                </p>
                <Badge
                  variant="outline"
                  className={
                    feedback.has_all_access
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }
                >
                  {feedback.has_all_access ? "Sim" : "Não"}
                </Badge>
              </div>
            </div>

            <hr className="border-border" />

            {/* Respostas de Texto */}
            <div className="space-y-4">
              <TextResponse
                label="O que surpreendeu positivamente"
                value={feedback.positive_surprise}
              />
              <TextResponse
                label="Acessos faltantes"
                value={feedback.missing_access}
              />
              <TextResponse
                label="Maiores dificuldades"
                value={feedback.difficulties}
              />
              <TextResponse
                label="Processos/ferramentas complicados"
                value={feedback.complicated_tools}
              />
              <TextResponse
                label="O que funcionou bem"
                value={feedback.what_worked_well}
              />
              <TextResponse
                label="Sugestões de melhoria"
                value={feedback.improvement_suggestions}
              />
              <TextResponse
                label="Dúvidas pendentes"
                value={feedback.pending_questions}
              />
              <TextResponse
                label="Sentimento geral"
                value={feedback.overall_feeling}
              />
              <TextResponse
                label="Comentários adicionais"
                value={feedback.additional_comments}
              />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
