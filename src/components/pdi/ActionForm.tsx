import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { PDI_ACTION_STATUS } from "@/components/shared/StatusBadge";
import type { PDIAction, ActionInput, ActionStatus } from "@/hooks/usePDIActions";
import type { PDICompetency } from "@/hooks/usePDICompetencies";

const schema = z.object({
  title: z.string().min(1, "Título obrigatório").max(200, "Máximo 200 caracteres"),
  description: z.string().optional(),
  competency_id: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(["todo", "doing", "done", "blocked"]),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget?: PDIAction | null;
  defaultStatus?: ActionStatus;
  competencies: PDICompetency[];
  onSubmit: (input: ActionInput) => Promise<void>;
  isSubmitting: boolean;
}

export function ActionForm({
  open,
  onOpenChange,
  editTarget,
  defaultStatus = "todo",
  competencies,
  onSubmit,
  isSubmitting,
}: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      competency_id: "",
      due_date: "",
      status: defaultStatus,
    },
  });

  useEffect(() => {
    if (open) {
      if (editTarget) {
        form.reset({
          title: editTarget.title,
          description: editTarget.description ?? "",
          competency_id: editTarget.competency_id ?? "",
          due_date: editTarget.due_date ?? "",
          status: editTarget.status,
        });
      } else {
        form.reset({
          title: "",
          description: "",
          competency_id: "",
          due_date: "",
          status: defaultStatus,
        });
      }
    }
  }, [open, editTarget, defaultStatus, form]);

  const handleSubmit = async (values: FormValues) => {
    await onSubmit({
      title: values.title,
      description: values.description || null,
      competency_id: values.competency_id || null,
      due_date: values.due_date || null,
      status: values.status,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editTarget ? "Editar ação" : "Adicionar ação"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Ler livro de comunicação" maxLength={200} {...field} />
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
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Detalhes sobre esta ação..." {...field} />
                  </FormControl>
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
                    <FormLabel>Competência vinculada (opcional)</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma competência" />
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
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data limite (opcional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PDI_ACTION_STATUS).map(([val, cfg]) => (
                        <SelectItem key={val} value={val}>
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editTarget ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
