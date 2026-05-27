import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const configSchema = z.object({
  message_template: z.string().min(1, "Template de mensagem é obrigatório"),
  send_to_slack: z.boolean(),
  send_to_feed: z.boolean(),
  send_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Horário inválido"),
});

type ConfigForm = z.infer<typeof configSchema>;

interface AutomationConfig {
  message_template?: string;
  send_to_slack?: boolean;
  send_to_feed?: boolean;
  send_time?: string;
}

interface ConfigureAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automationType: "birthday" | "anniversary" | "new_hire" | "reminder";
  automationId?: string;
  currentConfig?: AutomationConfig;
}

const defaultTemplates: Record<string, string> = {
  birthday: "🎂 Hoje é aniversário de {name}! Desejamos um dia incrível cheio de realizações! 🎉",
  anniversary: "🎉 {name} completa {years} ano(s) de empresa hoje! Parabéns pela jornada! 🚀",
  new_hire: "👋 Damos as boas-vindas a {name} que está chegando no time de {department}! Seja bem-vindo(a)!",
  reminder: "📅 Lembrete: {message}",
};

const typeLabels: Record<string, string> = {
  birthday: "Aniversários",
  anniversary: "Tempo de Empresa",
  new_hire: "Novos Colaboradores",
  reminder: "Lembretes",
};

export function ConfigureAutomationDialog({
  open,
  onOpenChange,
  automationType,
  automationId,
  currentConfig,
}: ConfigureAutomationDialogProps) {
  const { profile } = useUser();
  const queryClient = useQueryClient();

  const form = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      message_template: currentConfig?.message_template || defaultTemplates[automationType],
      send_to_slack: currentConfig?.send_to_slack ?? true,
      send_to_feed: currentConfig?.send_to_feed ?? true,
      send_time: currentConfig?.send_time || "09:00",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        message_template: currentConfig?.message_template || defaultTemplates[automationType],
        send_to_slack: currentConfig?.send_to_slack ?? true,
        send_to_feed: currentConfig?.send_to_feed ?? true,
        send_time: currentConfig?.send_time || "09:00",
      });
    }
  }, [open, currentConfig, automationType, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: ConfigForm) => {
      if (!profile?.primary_company_id) throw new Error("No company");

      const config = {
        message_template: values.message_template,
        send_to_slack: values.send_to_slack,
        send_to_feed: values.send_to_feed,
        send_time: values.send_time,
      };

      if (automationId) {
        const { error } = await supabase
          .from("automations")
          .update({ config })
          .eq("id", automationId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("automations").insert({
          company_id: profile.primary_company_id,
          name: typeLabels[automationType],
          type: automationType,
          enabled: true,
          config,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation", automationType] });
      toast.success("Configuração salva com sucesso!");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving automation config:", error);
      toast.error("Erro ao salvar configuração");
    },
  });

  const onSubmit = (values: ConfigForm) => {
    saveMutation.mutate(values);
  };

  const getPlaceholderHelp = () => {
    switch (automationType) {
      case "birthday":
        return "Variáveis disponíveis: {name}";
      case "anniversary":
        return "Variáveis disponíveis: {name}, {years}";
      case "new_hire":
        return "Variáveis disponíveis: {name}, {department}, {position}";
      case "reminder":
        return "Variáveis disponíveis: {message}";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurar {typeLabels[automationType]}</DialogTitle>
          <DialogDescription>
            Personalize a mensagem e canais de envio desta automação
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="message_template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template de Mensagem</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Digite o template da mensagem..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{getPlaceholderHelp()}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="send_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário de Envio</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormDescription>
                    Horário em que a automação será executada diariamente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 pt-2">
              <FormField
                control={form.control}
                name="send_to_feed"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Publicar no Feed</FormLabel>
                      <FormDescription>
                        Publicar automaticamente no feed da empresa
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="send_to_slack"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enviar para Slack</FormLabel>
                      <FormDescription>
                        Enviar mensagem para o canal #general do Slack
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Configuração
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
