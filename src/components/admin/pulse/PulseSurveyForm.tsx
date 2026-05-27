import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import {
  DEFAULT_PULSE_FORM,
  pulseSurveySchema,
  type PulseSurveyFormValues,
} from "@/lib/validation/pulseSurveySchema";
import type { PulseSurveyAdminRow } from "@/hooks/usePulseSurveysAdmin";
import { PulseQuestionPreview } from "./PulseQuestionPreview";

interface PulseSurveyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue?: PulseSurveyAdminRow | null;
  onSubmit: (values: PulseSurveyFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const WEEKDAYS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

function rowToFormValues(row: PulseSurveyAdminRow): PulseSurveyFormValues {
  return {
    name: row.name,
    question: row.question,
    question_type: row.question_type as PulseSurveyFormValues["question_type"],
    frequency: row.frequency as PulseSurveyFormValues["frequency"],
    day_of_week: row.day_of_week,
    day_of_month: row.day_of_month,
    send_hour_utc: row.send_hour_utc,
    target_all: row.target_all,
    target_departments: row.target_departments,
    target_teams: row.target_teams,
    anonymous: row.anonymous,
    require_comment_below: row.require_comment_below,
    active: row.active,
  };
}

export function PulseSurveyForm({
  open,
  onOpenChange,
  initialValue,
  onSubmit,
  isSubmitting,
}: PulseSurveyFormProps) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  const departmentsQuery = useQuery({
    queryKey: ["departments-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId && open,
  });

  const teamsQuery = useQuery({
    queryKey: ["teams-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId && open,
  });

  const form = useForm<PulseSurveyFormValues>({
    resolver: zodResolver(pulseSurveySchema),
    defaultValues: DEFAULT_PULSE_FORM,
  });

  useEffect(() => {
    if (open) {
      form.reset(initialValue ? rowToFormValues(initialValue) : DEFAULT_PULSE_FORM);
    }
  }, [open, initialValue, form]);

  const frequency = form.watch("frequency");
  const questionType = form.watch("question_type");
  const targetAll = form.watch("target_all");
  const question = form.watch("question");
  const anonymousLocked = useMemo(
    () => Boolean(initialValue?.has_responses),
    [initialValue],
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  const departments = departmentsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {initialValue ? "Editar pesquisa Pulse" : "Nova pesquisa Pulse"}
          </DialogTitle>
          <DialogDescription>
            Pulse é uma pergunta curta enviada em cadência fixa (semanal, quinzenal ou mensal).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1 pr-3 -mr-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome interno</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: Clima semanal" {...field} />
                        </FormControl>
                        <FormDescription>Visível só para admins.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="question"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pergunta</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Como você está se sentindo no trabalho esta semana?"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="question_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de resposta</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="grid grid-cols-1 gap-1"
                          >
                            <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                              <RadioGroupItem value="scale_1_5" /> Escala 1–5
                            </Label>
                            <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                              <RadioGroupItem value="enps_0_10" /> eNPS 0–10
                            </Label>
                            <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                              <RadioGroupItem value="mood_emoji" /> Mood (emojis)
                            </Label>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequência</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            if (v === "monthly") {
                              form.setValue("day_of_week", null);
                              if (form.getValues("day_of_month") === null) {
                                form.setValue("day_of_month", 1);
                              }
                            } else {
                              form.setValue("day_of_month", null);
                              if (form.getValues("day_of_week") === null) {
                                form.setValue("day_of_week", 1);
                              }
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="biweekly">Quinzenal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(frequency === "weekly" || frequency === "biweekly") && (
                    <FormField
                      control={form.control}
                      name="day_of_week"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia da semana</FormLabel>
                          <Select
                            value={field.value !== null ? String(field.value) : ""}
                            onValueChange={(v) => field.onChange(Number(v))}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {WEEKDAYS.map((d) => (
                                <SelectItem key={d.value} value={String(d.value)}>
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {frequency === "monthly" && (
                    <FormField
                      control={form.control}
                      name="day_of_month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia do mês (1–28)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={28}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value === "" ? null : Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="send_hour_utc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horário de envio (UTC)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={23}
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          0–23. UTC = Brasília −3h (12h UTC = 09h BR).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <PulseQuestionPreview question={question} questionType={questionType} />

                  <FormField
                    control={form.control}
                    name="target_all"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FormLabel className="text-sm">Toda a empresa</FormLabel>
                          <FormDescription className="text-xs">
                            Desligue para escolher áreas/times.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {!targetAll && (
                    <>
                      <FormField
                        control={form.control}
                        name="target_departments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Áreas</FormLabel>
                            <div className="rounded-md border p-2 max-h-32 overflow-y-auto space-y-1">
                              {departments.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Nenhuma área cadastrado.
                                </p>
                              )}
                              {departments.map((d) => (
                                <Label
                                  key={d.id}
                                  className="flex items-center gap-2 text-sm cursor-pointer"
                                >
                                  <Checkbox
                                    checked={field.value.includes(d.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) field.onChange([...field.value, d.id]);
                                      else field.onChange(field.value.filter((id) => id !== d.id));
                                    }}
                                  />
                                  {d.name}
                                </Label>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="target_teams"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Times</FormLabel>
                            <div className="rounded-md border p-2 max-h-32 overflow-y-auto space-y-1">
                              {teams.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Nenhum time cadastrado.
                                </p>
                              )}
                              {teams.map((t) => (
                                <Label
                                  key={t.id}
                                  className="flex items-center gap-2 text-sm cursor-pointer"
                                >
                                  <Checkbox
                                    checked={field.value.includes(t.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) field.onChange([...field.value, t.id]);
                                      else field.onChange(field.value.filter((id) => id !== t.id));
                                    }}
                                  />
                                  {t.name}
                                </Label>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="anonymous"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FormLabel className="text-sm">Respostas anônimas</FormLabel>
                          <FormDescription className="text-xs">
                            {anonymousLocked
                              ? "Bloqueado: já existem respostas para esta pesquisa."
                              : "Não associa a resposta ao usuário."}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={anonymousLocked}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {questionType !== "mood_emoji" && (
                    <FormField
                      control={form.control}
                      name="require_comment_below"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pedir comentário se score ≤</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={10}
                              placeholder="(opcional)"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value === "" ? null : Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Quando o score for menor ou igual a este número, abre campo de comentário.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FormLabel className="text-sm">Ativo</FormLabel>
                          <FormDescription className="text-xs">
                            Quando inativo, o cron não envia.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="border-t pt-3 mt-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialValue ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
