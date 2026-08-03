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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import type { CreateCycleInput, PerformanceCycleType, PerformanceCycle } from "@/hooks/usePerformanceCycles";

const formSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório"),
    description: z.string().optional(),
    type: z.enum(["full", "pocket", "self", "180", "360", "leader", "custom"]),
    start_date: z.string().min(1, "Data de início é obrigatória"),
    end_date: z.string().min(1, "Data de término é obrigatória"),
    target_all: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (!data.start_date || !data.end_date) return true;
      return new Date(data.end_date) > new Date(data.start_date);
    },
    {
      message: "Data final deve ser posterior à inicial.",
      path: ["end_date"],
    },
  );

type FormData = z.infer<typeof formSchema>;

interface CreateCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCycleInput) => void;
  isLoading?: boolean;
  /**
   * Ciclo a editar. Só faz sentido em rascunho: depois de iniciado, as
   * avaliações já existem e mudar tipo ou público deixaria o que foi gerado
   * inconsistente com a configuração.
   */
  cycle?: PerformanceCycle | null;
}

const cycleTypes: { value: PerformanceCycleType; label: string; description: string }[] = [
  { value: "full", label: "Full", description: "Autoavaliação + Gestor + Calibragem + Feedback" },
  { value: "pocket", label: "Pocket", description: "Avaliação do Gestor + Feedback" },
  { value: "self", label: "Autoavaliação", description: "Colaborador avalia a si mesmo" },
  { value: "180", label: "180°", description: "Gestor avalia liderado + Autoavaliação" },
  { value: "360", label: "360°", description: "Gestor + Pares + Auto + Liderados" },
  { value: "leader", label: "Avaliação de Líder", description: "Liderado avalia gestor" },
  { value: "custom", label: "Personalizado", description: "Configuração livre" },
];

const VAZIO: FormData = {
  name: "",
  description: "",
  type: "full",
  start_date: "",
  end_date: "",
  target_all: true,
};

export function CreateCycleDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  cycle,
}: CreateCycleDialogProps) {
  const editando = !!cycle;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: VAZIO,
  });

  // O formulário é montado uma vez e reaproveitado entre aberturas. Sem este
  // reset, abrir "editar" depois de "novo" (ou o inverso) mostraria os valores
  // da vez anterior.
  useEffect(() => {
    if (!open) return;
    form.reset(
      cycle
        ? {
            name: cycle.name,
            description: cycle.description ?? "",
            type: cycle.type,
            start_date: cycle.start_date?.slice(0, 10) ?? "",
            end_date: cycle.end_date?.slice(0, 10) ?? "",
            target_all: cycle.target_all ?? true,
          }
        : VAZIO,
    );
  }, [open, cycle, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit({
      name: data.name,
      description: data.description,
      type: data.type,
      start_date: data.start_date,
      end_date: data.end_date,
      target_all: data.target_all,
    });
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar Ciclo de Avaliação" : "Novo Ciclo de Avaliação"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Ciclo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Avaliação Anual 2024" {...field} />
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
                    <Textarea
                      placeholder="Descreva o objetivo deste ciclo de avaliação..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Avaliação</FormLabel>
                  {/* controlado (value, não defaultValue): em edição o form.reset
                      precisa refletir o tipo salvo no seletor */}
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cycleTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <span className="font-medium">{type.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {type.description}
                            </span>
                          </div>
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
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Término</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="target_all"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Incluir todos os colaboradores da empresa
                  </FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editando ? "Salvar alterações" : "Criar Ciclo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
