import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { UserPicker } from "@/components/feedback/UserPicker";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { oneOnOneSchema, type OneOnOneFormValues } from "@/lib/validation/oneOnOneSchema";
import type { OneOnOneRow } from "@/hooks/useOneOnOnes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OneOnOneFormValues) => Promise<void>;
  isSubmitting: boolean;
  editTarget?: OneOnOneRow | null;
  currentUserId: string;
}

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

function defaultScheduledAt(): string {
  return toLocalDatetimeValue(addDays(new Date(), 1).toISOString());
}

export function OneOnOneForm({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  editTarget,
  currentUserId,
}: Props) {
  const { data: companyUsers = [], isLoading: usersLoading } = useCompanyUsers();

  const form = useForm<OneOnOneFormValues>({
    resolver: zodResolver(oneOnOneSchema),
    defaultValues: {
      counterpart_id: "",
      scheduled_at: defaultScheduledAt(),
      duration_minutes: 30,
      location: "",
      recurrence: "none",
      i_am_member: false,
    },
  });

  useEffect(() => {
    if (open) {
      if (editTarget) {
        const counterpart =
          editTarget.leader_id === currentUserId
            ? editTarget.member_id
            : editTarget.leader_id;
        form.reset({
          counterpart_id: counterpart,
          scheduled_at: toLocalDatetimeValue(editTarget.scheduled_at),
          duration_minutes: editTarget.duration_minutes,
          location: editTarget.location ?? "",
          recurrence: editTarget.recurrence,
          i_am_member: editTarget.member_id === currentUserId,
        });
      } else {
        form.reset({
          counterpart_id: "",
          scheduled_at: defaultScheduledAt(),
          duration_minutes: 30,
          location: "",
          recurrence: "none",
          i_am_member: false,
        });
      }
    }
  }, [open, editTarget, currentUserId, form]);

  const handleSubmit = async (values: OneOnOneFormValues) => {
    await onSubmit(values);
    onOpenChange(false);
  };

  const isEdit = !!editTarget;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar 1:1" : "Agendar 1:1"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {!isEdit && (
              <FormField
                control={form.control}
                name="counterpart_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraparte</FormLabel>
                    <FormControl>
                      <UserPicker
                        users={companyUsers}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={usersLoading ? "Carregando..." : "Selecione uma pessoa"}
                        disabled={usersLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!isEdit && (
              <FormField
                control={form.control}
                name="i_am_member"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-sm">Sou o liderado nessa reunião</FormLabel>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Por padrão você é o líder. Ative se for o liderado.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="scheduled_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data e hora</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração (minutos)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 30)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Sala 2, Google Meet..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <FormField
                control={form.control}
                name="recurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recorrência</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sem recorrência</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="biweekly">Quinzenal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Salvar alterações" : "Agendar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
