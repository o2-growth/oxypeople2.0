import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import type { FeedbackDetailRow } from "@/hooks/useFeedbackDetail";

interface Props {
  feedback: FeedbackDetailRow;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const schema = z.object({
  pdi_plan_id: z.string().min(1, "Selecione um PDI"),
  competency_id: z.string(),
  title: z.string().min(1, "Título obrigatório"),
  description: z.string(),
});

type FormValues = z.infer<typeof schema>;

export function CreatePDIActionFromFeedback({
  feedback,
  currentUserId,
  open,
  onOpenChange,
}: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const respondentName = feedback.respondent?.full_name ?? "respondente";
  const previewText = (feedback.response ?? feedback.question).slice(0, 80);
  const defaultTitle = `Trabalhar feedback de ${respondentName}: ${previewText}`;
  const defaultDescription = feedback.response ?? feedback.question;

  const { data: activePlans = [] } = useQuery({
    queryKey: ["pdi-plans-active", currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdi_plans")
        .select("id, title")
        .eq("user_id", currentUserId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!currentUserId,
  });

  const { data: existingAction } = useQuery({
    queryKey: ["pdi-action-from-feedback", feedback.id, currentUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pdi_actions")
        .select("id, pdi_plan_id")
        .eq("feedback_request_id", feedback.id)
        .maybeSingle();
      return data ?? null;
    },
    enabled: open && !!currentUserId,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      pdi_plan_id: "",
      competency_id: "",
      title: defaultTitle,
      description: defaultDescription,
    },
  });

  const selectedPlanId = form.watch("pdi_plan_id");

  // Auto-select plan when there's only one
  useEffect(() => {
    if (activePlans.length === 1 && !form.getValues("pdi_plan_id")) {
      form.setValue("pdi_plan_id", activePlans[0].id);
    }
  }, [activePlans, form]);

  const { data: competencies = [] } = useQuery({
    queryKey: ["pdi-competencies", selectedPlanId],
    queryFn: async () => {
      if (!selectedPlanId) return [];
      const { data } = await supabase
        .from("pdi_competencies")
        .select("id, name")
        .eq("pdi_plan_id", selectedPlanId);
      return data ?? [];
    },
    enabled: !!selectedPlanId,
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const planId = values.pdi_plan_id;

      // Get current max order_index
      const { data: currentActions } = await supabase
        .from("pdi_actions")
        .select("order_index")
        .eq("pdi_plan_id", planId)
        .order("order_index", { ascending: false })
        .limit(1);

      const maxIndex = currentActions?.[0]?.order_index ?? -1;

      const { error } = await supabase.from("pdi_actions").insert({
        pdi_plan_id: planId,
        feedback_request_id: feedback.id,
        competency_id: values.competency_id || null,
        title: values.title,
        description: values.description || null,
        status: "todo",
        order_index: maxIndex + 1,
      });

      if (error) throw error;

      trackEvent("pdi_action_created", { from_feedback: true });
      queryClient.invalidateQueries({ queryKey: ["pdi-actions", planId] });
      queryClient.invalidateQueries({
        queryKey: ["pdi-action-from-feedback", feedback.id, currentUserId],
      });
      toast.success("Ação criada no PDI!");
      onOpenChange(false);
      navigate(`/pdi/${planId}`);
    } catch (err) {
      toast.error("Erro ao criar ação. Tente novamente.");
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Criar ação no PDI
          </DialogTitle>
        </DialogHeader>

        {activePlans.length === 0 ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Você não tem PDI ativo. Crie um PDI antes de vincular ações.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                navigate("/pdi");
              }}
            >
              Ir para PDI
            </Button>
          </div>
        ) : existingAction ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Já existe uma ação criada a partir deste feedback.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                navigate(`/pdi/${existingAction.pdi_plan_id}`);
              }}
            >
              Ver ação no PDI
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="pdi_plan_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PDI</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o PDI" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activePlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {competencies.length > 0 && (
                <FormField
                  control={form.control}
                  name="competency_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Competência (opcional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Nenhuma" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nenhuma</SelectItem>
                          {competencies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título da ação</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar ação
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
