import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSubmitFeedback, FeedbackFormData } from "@/hooks/useOnboardingFeedback";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const feedbackSchema = z.object({
  overall_rating: z.number().min(1).max(5),
  positive_surprise: z.string().min(1, "Campo obrigatório"),
  integration_level: z.enum(["sim_totalmente", "sim_em_parte", "nao_muito", "nao"]),
  has_all_access: z.boolean(),
  missing_access: z.string().optional(),
  tools_ease_rating: z.number().min(1).max(5),
  training_rating: z.number().min(1).max(5),
  clarity_level: z.enum(["sim", "em_parte", "nao"]),
  difficulties: z.string().min(1, "Campo obrigatório"),
  complicated_tools: z.string().optional(),
  onboarding_rating: z.number().min(1).max(5),
  what_worked_well: z.string().min(1, "Campo obrigatório"),
  improvement_suggestions: z.string().min(1, "Campo obrigatório"),
  pending_questions: z.string().optional(),
  overall_feeling: z.string().min(1, "Campo obrigatório"),
  additional_comments: z.string().optional(),
});

interface FeedbackFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dueDate?: string;
}

function RatingStars({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="p-1 transition-transform hover:scale-110"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                (hovered || value) >= star
                  ? "fill-warning text-warning"
                  : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeedbackFormDialog({
  open,
  onOpenChange,
  dueDate,
}: FeedbackFormDialogProps) {
  const submitFeedback = useSubmitFeedback();

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      overall_rating: 0,
      positive_surprise: "",
      integration_level: undefined,
      has_all_access: undefined,
      missing_access: "",
      tools_ease_rating: 0,
      training_rating: 0,
      clarity_level: undefined,
      difficulties: "",
      complicated_tools: "",
      onboarding_rating: 0,
      what_worked_well: "",
      improvement_suggestions: "",
      pending_questions: "",
      overall_feeling: "",
      additional_comments: "",
    },
  });

  const onSubmit = async (data: FeedbackFormData) => {
    await submitFeedback.mutateAsync(data);
    onOpenChange(false);
  };

  const watchHasAccess = form.watch("has_all_access");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Feedback de Integração - 30 Dias
          </DialogTitle>
          <DialogDescription>
            Compartilhe sua experiência nos primeiros 30 dias na empresa.
            {dueDate && (
              <span className="block mt-1 text-warning">
                Prazo para responder: {new Date(dueDate).toLocaleDateString("pt-BR")}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Pergunta 1: Avaliação geral */}
            <RatingStars
              label="1. Como você avalia seus primeiros 30 dias no geral?"
              value={form.watch("overall_rating")}
              onChange={(v) => form.setValue("overall_rating", v)}
            />
            {form.formState.errors.overall_rating && (
              <p className="text-sm text-destructive">Selecione uma avaliação</p>
            )}

            {/* Pergunta 2: Surpresa positiva */}
            <div className="space-y-2">
              <Label htmlFor="positive_surprise">
                2. O que mais te surpreendeu positivamente nesses primeiros dias?
              </Label>
              <Textarea
                id="positive_surprise"
                {...form.register("positive_surprise")}
                placeholder="Descreva o que mais te surpreendeu..."
              />
              {form.formState.errors.positive_surprise && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.positive_surprise.message}
                </p>
              )}
            </div>

            {/* Pergunta 3: Integração */}
            <div className="space-y-2">
              <Label>3. Você se sente bem integrado(a) à equipe até agora?</Label>
              <RadioGroup
                value={form.watch("integration_level")}
                onValueChange={(v) =>
                  form.setValue("integration_level", v as FeedbackFormData["integration_level"])
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim_totalmente" id="int_1" />
                  <Label htmlFor="int_1" className="font-normal">Sim, totalmente</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim_em_parte" id="int_2" />
                  <Label htmlFor="int_2" className="font-normal">Sim, em parte</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao_muito" id="int_3" />
                  <Label htmlFor="int_3" className="font-normal">Não muito</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="int_4" />
                  <Label htmlFor="int_4" className="font-normal">Não</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Pergunta 4: Acessos */}
            <div className="space-y-2">
              <Label>4. Você tem todos os acessos necessários para o seu trabalho?</Label>
              <RadioGroup
                value={watchHasAccess === true ? "true" : watchHasAccess === false ? "false" : ""}
                onValueChange={(v) => form.setValue("has_all_access", v === "true")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="access_yes" />
                  <Label htmlFor="access_yes" className="font-normal">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="access_no" />
                  <Label htmlFor="access_no" className="font-normal">Não</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Pergunta 5: Acessos faltantes */}
            {watchHasAccess === false && (
              <div className="space-y-2">
                <Label htmlFor="missing_access">
                  5. Se faltou algum acesso ou recurso, descreva quais:
                </Label>
                <Textarea
                  id="missing_access"
                  {...form.register("missing_access")}
                  placeholder="Descreva os acessos ou recursos que faltaram..."
                />
              </div>
            )}

            {/* Pergunta 6: Ferramentas */}
            <RatingStars
              label="6. As ferramentas e sistemas que você usa são fáceis de usar e entender?"
              value={form.watch("tools_ease_rating")}
              onChange={(v) => form.setValue("tools_ease_rating", v)}
            />

            {/* Pergunta 7: Treinamento */}
            <RatingStars
              label="7. O treinamento/onboarding inicial foi suficiente para começar com confiança?"
              value={form.watch("training_rating")}
              onChange={(v) => form.setValue("training_rating", v)}
            />

            {/* Pergunta 8: Clareza */}
            <div className="space-y-2">
              <Label>8. Você tem clareza total sobre suas responsabilidades e expectativas?</Label>
              <RadioGroup
                value={form.watch("clarity_level")}
                onValueChange={(v) =>
                  form.setValue("clarity_level", v as FeedbackFormData["clarity_level"])
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="clarity_1" />
                  <Label htmlFor="clarity_1" className="font-normal">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="em_parte" id="clarity_2" />
                  <Label htmlFor="clarity_2" className="font-normal">Em parte</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="clarity_3" />
                  <Label htmlFor="clarity_3" className="font-normal">Não</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Pergunta 9: Dificuldades */}
            <div className="space-y-2">
              <Label htmlFor="difficulties">
                9. Quais foram as maiores dificuldades ou obstáculos nesses 30 dias?
              </Label>
              <Textarea
                id="difficulties"
                {...form.register("difficulties")}
                placeholder="Descreva as dificuldades encontradas..."
              />
              {form.formState.errors.difficulties && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.difficulties.message}
                </p>
              )}
            </div>

            {/* Pergunta 10: Ferramentas complicadas */}
            <div className="space-y-2">
              <Label htmlFor="complicated_tools">
                10. Houve algum processo ou ferramenta que te pareceu mais complicado do que o esperado?
              </Label>
              <Textarea
                id="complicated_tools"
                {...form.register("complicated_tools")}
                placeholder="Descreva processos ou ferramentas complicados..."
              />
            </div>

            {/* Pergunta 11: Avaliação onboarding */}
            <RatingStars
              label="11. Como você avalia o processo de onboarding até aqui?"
              value={form.watch("onboarding_rating")}
              onChange={(v) => form.setValue("onboarding_rating", v)}
            />

            {/* Pergunta 12: O que funcionou */}
            <div className="space-y-2">
              <Label htmlFor="what_worked_well">
                12. O que funcionou bem no onboarding?
              </Label>
              <Textarea
                id="what_worked_well"
                {...form.register("what_worked_well")}
                placeholder="Descreva o que funcionou bem..."
              />
              {form.formState.errors.what_worked_well && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.what_worked_well.message}
                </p>
              )}
            </div>

            {/* Pergunta 13: Sugestões de melhoria */}
            <div className="space-y-2">
              <Label htmlFor="improvement_suggestions">
                13. O que poderíamos melhorar ou adicionar para facilitar a adaptação?
              </Label>
              <Textarea
                id="improvement_suggestions"
                {...form.register("improvement_suggestions")}
                placeholder="Suas sugestões de melhoria..."
              />
              {form.formState.errors.improvement_suggestions && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.improvement_suggestions.message}
                </p>
              )}
            </div>

            {/* Pergunta 14: Dúvidas pendentes */}
            <div className="space-y-2">
              <Label htmlFor="pending_questions">
                14. Há alguma dúvida pendente ou algo que você gostaria de suporte adicional?
              </Label>
              <Textarea
                id="pending_questions"
                {...form.register("pending_questions")}
                placeholder="Descreva suas dúvidas pendentes..."
              />
            </div>

            {/* Pergunta 15: Sentimento geral */}
            <div className="space-y-2">
              <Label htmlFor="overall_feeling">
                15. No geral, descreva como você está se sentindo nesses primeiros dias:
              </Label>
              <Textarea
                id="overall_feeling"
                {...form.register("overall_feeling")}
                placeholder="Descreva como está se sentindo..."
              />
              {form.formState.errors.overall_feeling && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.overall_feeling.message}
                </p>
              )}
            </div>

            {/* Pergunta 16: Comentários adicionais */}
            <div className="space-y-2">
              <Label htmlFor="additional_comments">
                16. Algum comentário adicional? (opcional)
              </Label>
              <Textarea
                id="additional_comments"
                {...form.register("additional_comments")}
                placeholder="Comentários adicionais..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitFeedback.isPending}
                className="bg-gradient-primary"
              >
                {submitFeedback.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enviar Feedback
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
