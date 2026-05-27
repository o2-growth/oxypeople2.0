import { useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  DEFAULT_NINE_BOX_FORM,
  nineBoxSnapshotSchema,
  type NineBoxSnapshotFormValues,
} from "@/lib/validation/nineBoxSchema";

interface CreateSnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: NineBoxSnapshotFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const NO_CYCLE = "__none__";

export function CreateSnapshotDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: CreateSnapshotDialogProps) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  const cyclesQuery = useQuery({
    queryKey: ["performance-cycles", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("performance_cycles")
        .select("id, name, status")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId && open,
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      return data ?? [];
    },
    enabled: !!companyId && open,
  });

  const teamsQuery = useQuery({
    queryKey: ["teams-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("teams")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      return data ?? [];
    },
    enabled: !!companyId && open,
  });

  const form = useForm<NineBoxSnapshotFormValues>({
    resolver: zodResolver(nineBoxSnapshotSchema),
    defaultValues: DEFAULT_NINE_BOX_FORM,
  });

  useEffect(() => {
    if (open) form.reset(DEFAULT_NINE_BOX_FORM);
  }, [open, form]);

  const targetAll = form.watch("target_all");
  const cycleId = form.watch("cycle_id");

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo snapshot Nine Box</DialogTitle>
          <DialogDescription>
            Cria uma matriz de calibração. Se vincular a um ciclo, o eixo de performance
            é populado automaticamente a partir das avaliações.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Calibração Q2 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cycle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciclo de avaliação (opcional)</FormLabel>
                  <Select
                    value={field.value ?? NO_CYCLE}
                    onValueChange={(v) => field.onChange(v === NO_CYCLE ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sem ciclo (snapshot vazio)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_CYCLE}>Sem ciclo (snapshot vazio)</SelectItem>
                      {(cyclesQuery.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Quando definido, busca avaliações com `status='completed'` para
                    calcular o eixo de performance automaticamente.
                  </FormDescription>
                </FormItem>
              )}
            />

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
                        {(departmentsQuery.data ?? []).map((d) => (
                          <Label
                            key={d.id}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <Checkbox
                              checked={field.value.includes(d.id)}
                              onCheckedChange={(checked) =>
                                field.onChange(
                                  checked
                                    ? [...field.value, d.id]
                                    : field.value.filter((id) => id !== d.id),
                                )
                              }
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
                        {(teamsQuery.data ?? []).map((t) => (
                          <Label
                            key={t.id}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <Checkbox
                              checked={field.value.includes(t.id)}
                              onCheckedChange={(checked) =>
                                field.onChange(
                                  checked
                                    ? [...field.value, t.id]
                                    : field.value.filter((id) => id !== t.id),
                                )
                              }
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

            <DialogFooter className="border-t pt-3 mt-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {cycleId ? "Criar e calibrar" : "Criar snapshot"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
