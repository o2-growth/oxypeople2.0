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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { useUpdateKeyResult } from "@/hooks/useObjectives";
import { useCompanyMembers } from "@/hooks/useTeams";
import { type KeyResult } from "./KeyResultItem";
import { toast } from "sonner";

const formSchema = z.object({
  title:         z.string().min(1, "Título obrigatório"),
  kr_type:       z.string(),
  direction:     z.string(),
  initial_value: z.coerce.number(),
  target_value:  z.coerce.number(),
  unit:          z.string().optional(),
  owner_user_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  keyResult: KeyResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const krTypeLabels: Record<string, string> = {
  numeric:  "Numérico",
  percent:  "Percentual",
  binary:   "Binário (Sim/Não)",
  currency: "Monetário",
  sla_time: "SLA/Tempo",
};

const directionLabels: Record<string, string> = {
  up:   "Aumentar (↑)",
  down: "Diminuir (↓)",
};

export function EditKeyResultDialog({ keyResult, open, onOpenChange }: Props) {
  const updateKR    = useUpdateKeyResult();
  const { data: members = [] } = useCompanyMembers();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title:         "",
      kr_type:       "numeric",
      direction:     "up",
      initial_value: 0,
      target_value:  100,
      unit:          "",
      owner_user_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title:         keyResult.title,
        kr_type:       keyResult.kr_type ?? "numeric",
        direction:     keyResult.direction ?? "up",
        initial_value: keyResult.initial_value ?? 0,
        target_value:  keyResult.target_value,
        unit:          keyResult.unit ?? "",
        owner_user_id: keyResult.owner_user_id ?? "",
      });
    }
  }, [open, keyResult, form]);

  const onSubmit = async (data: FormData) => {
    try {
      await updateKR.mutateAsync({
        id:            keyResult.id,
        title:         data.title,
        kr_type:       data.kr_type,
        direction:     data.direction,
        initial_value: data.initial_value,
        target_value:  data.target_value,
        unit:          data.unit || null,
        owner_user_id: data.owner_user_id || null,
      });
      toast.success("KR atualizado!");
      onOpenChange(false);
    } catch {
      // error already shown by mutation onError
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Key Result</DialogTitle>
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

            {/* Responsável */}
            <FormField
              control={form.control}
              name="owner_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Sem responsável</SelectItem>
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

            {/* Tipo + Direção */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="kr_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(krTypeLabels).map(([v, l]) => (
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
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direção</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(directionLabels).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Valor inicial + Meta + Unidade */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="initial_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor inicial</FormLabel>
                    <FormControl><Input type="number" step="any" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="target_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta</FormLabel>
                    <FormControl><Input type="number" step="any" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <FormControl><Input placeholder="%, R$, pts…" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateKR.isPending}>
                {updateKR.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
