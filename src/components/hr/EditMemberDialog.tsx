import { useEffect, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { useUpdateMember, type CompanyMember } from "@/hooks/usePeopleList";
import { useDepartmentOptions } from "@/hooks/usePeopleWithBirthdays";
import { useTeamsByUser } from "@/hooks/useTeams";
import { ManagerSelect, SEM_GESTOR } from "@/components/people/ManagerSelect";
import { TeamsSelect } from "@/components/people/TeamsSelect";

const NO_DEPT = "__none__";

const formSchema = z.object({
  position: z.string(),
  department_id: z.string(),
  role: z.enum(["owner", "admin", "manager", "member"]),
  manager_id: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  member: CompanyMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Admin",
  manager: "Gestor",
  member: "Membro",
};

export function EditMemberDialog({ member, open, onOpenChange }: Props) {
  const updateMember = useUpdateMember();
  const { data: departments = [] } = useDepartmentOptions();
  const { data: timesPorPessoa = {} } = useTeamsByUser();

  const [times, setTimes] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      position: "",
      department_id: NO_DEPT,
      role: "member",
      manager_id: SEM_GESTOR,
    },
  });

  useEffect(() => {
    if (member && open) {
      form.reset({
        position: member.position ?? "",
        department_id: member.department_id ?? NO_DEPT,
        role: (member.role as FormData["role"]) ?? "member",
        manager_id: member.manager_id ?? SEM_GESTOR,
      });
      setTimes((timesPorPessoa[member.user_id] ?? []).map((t) => t.id));
    }
  }, [member, open, form, timesPorPessoa]);

  const onSubmit = async (data: FormData) => {
    if (!member) return;
    await updateMember.mutateAsync({
      membershipId: member.id,
      userId: member.user_id,
      position: data.position,
      department_id: data.department_id === NO_DEPT ? null : data.department_id,
      role: data.role,
      manager_id: data.manager_id === SEM_GESTOR ? null : data.manager_id,
      teamIds: times,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar colaborador</DialogTitle>
        </DialogHeader>

        {member && (
          <div className="flex flex-wrap items-center gap-x-2 pb-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {member.user?.full_name || member.user?.email}
            </span>
            <span>·</span>
            <span className="truncate">{member.user?.email}</span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Analista de FP&A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Área</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar área" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_DEPT}>Sem área</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
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
              name="manager_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Gestor</FormLabel>
                  <FormControl>
                    <ManagerSelect
                      value={field.value}
                      onChange={field.onChange}
                      excludeUserId={member?.user_id}
                    />
                  </FormControl>
                  <FormDescription>
                    É daqui que sai quem avalia quem no ciclo de desempenho.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem className="flex flex-col">
              <FormLabel>Times e squads</FormLabel>
              <TeamsSelect value={times} onChange={setTimes} userId={member?.user_id} />
              <FormDescription>
                Dá para estar em mais de um. Tirar de um time onde a pessoa é
                líder deixa o time sem liderança.
              </FormDescription>
            </FormItem>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acesso na plataforma</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    O que a pessoa enxerga e administra. É diferente de liderar um time.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMember.isPending}>
                {updateMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
