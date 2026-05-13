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
import type { PDICompetency, CompetencyInput, CompetencyCategory } from "@/hooks/usePDICompetencies";

const schema = z
  .object({
    name: z.string().min(1, "Nome obrigatório"),
    description: z.string().optional(),
    category: z.enum(["technical", "leadership", "behavioral", "other", ""]).optional(),
    current_level: z.coerce.number().min(1).max(5),
    target_level: z.coerce.number().min(1).max(5),
  })
  .refine((d) => d.target_level >= d.current_level, {
    message: "Nível alvo precisa ser maior ou igual ao atual",
    path: ["target_level"],
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget?: PDICompetency | null;
  onSubmit: (input: CompetencyInput) => Promise<void>;
  isSubmitting: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Técnica",
  leadership: "Liderança",
  behavioral: "Comportamental",
  other: "Outra",
};

const LEVEL_OPTIONS = [1, 2, 3, 4, 5];

export function CompetencyForm({ open, onOpenChange, editTarget, onSubmit, isSubmitting }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      current_level: 1,
      target_level: 3,
    },
  });

  useEffect(() => {
    if (open) {
      if (editTarget) {
        form.reset({
          name: editTarget.name,
          description: editTarget.description ?? "",
          category: editTarget.category ?? "",
          current_level: editTarget.current_level,
          target_level: editTarget.target_level,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          category: "",
          current_level: 1,
          target_level: 3,
        });
      }
    }
  }, [open, editTarget, form]);

  const handleSubmit = async (values: FormValues) => {
    await onSubmit({
      name: values.name,
      description: values.description || null,
      category: (values.category as CompetencyCategory) || null,
      current_level: values.current_level,
      target_level: values.target_level,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editTarget ? "Editar competência" : "Adicionar competência"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Comunicação assertiva" {...field} />
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
                    <Textarea rows={2} placeholder="Descreva esta competência..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Sem categoria</SelectItem>
                      {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="current_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível atual</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEVEL_OPTIONS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível alvo</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEVEL_OPTIONS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
