import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { useUpdateObjective, type ObjectiveWithDetails } from "@/hooks/useObjectives";
import { useCompanyMembers } from "@/hooks/useTeams";
import { toast } from "sonner";

const formSchema = z.object({
  title:           z.string().min(1, "Título obrigatório"),
  description:     z.string().optional(),
  due_date:        z.string().optional(),
  status:          z.enum(["planned", "active", "risk", "completed", "canceled"]),
  visibility:      z.enum(["public", "company", "private"]),
  commitment_type: z.enum(["committed", "aspirational"]),
  owner_id:        z.string().min(1, "Responsável obrigatório"),
  department:      z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  objective: ObjectiveWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<string, string> = {
  planned:   "Planejado",
  active:    "Ativo",
  risk:      "Em risco",
  completed: "Concluído",
  canceled:  "Cancelado",
};

const visibilityLabels: Record<string, string> = {
  public:  "Público",
  company: "Empresa",
  private: "Privado",
};

const commitmentLabels: Record<string, string> = {
  committed:   "Compromissada",
  aspirational: "Aspiracional",
};

export function EditObjectiveDialog({ objective, open, onOpenChange }: Props) {
  const updateObjective = useUpdateObjective();
  const { data: members = [] } = useCompanyMembers();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title:           "",
      description:     "",
      due_date:        "",
      status:          "planned",
      visibility:      "company",
      commitment_type: "committed",
      owner_id:        "",
      department:      "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title:           objective.title,
        description:     objective.description ?? "",
        due_date:        objective.due_date ? objective.due_date.slice(0, 10) : "",
        status:          objective.status,
        visibility:      (objective.visibility as FormData["visibility"]) ?? "company",
        commitment_type: ((objective as any).commitment_type as FormData["commitment_type"]) ?? "committed",
        owner_id:        objective.owner_id ?? "",
        department:      objective.department ?? "",
      });
    }
  }, [open, objective, form]);

  const onSubmit = async (data: FormData) => {
    await updateObjective.mutateAsync({
      id:              objective.id,
      title:           data.title,
      description:     data.description || undefined,
      due_date:        data.due_date || undefined,
      status:          data.status,
      visibility:      data.visibility,
      commitment_type: data.commitment_type,
      owner_id:        data.owner_id,
      department:      data.department || undefined,
    });
    toast.success("Objetivo atualizado!");
    onOpenChange(false);
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Objetivo</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Título */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Textarea rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Responsável */}
            <FormField
              control={form.control}
              name="owner_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map((m) => {
                        const user = (m as any).user;
                        const name = user?.full_name || user?.email || "";
                        return (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={user?.avatar_url ?? undefined} />
                                <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
                              </Avatar>
                              <span>{name}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Departamento + Prazo */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <FormControl><Input placeholder="Ex: Marketing" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status + Commitment */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commitment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(commitmentLabels).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Visibilidade */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibilidade</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(visibilityLabels).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
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
              <Button type="submit" disabled={updateObjective.isPending}>
                {updateObjective.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
