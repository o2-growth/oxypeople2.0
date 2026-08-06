import { useEffect, useMemo, useState } from "react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateMember, usePeopleList, type CompanyMember } from "@/hooks/usePeopleList";
import { useDepartmentOptions } from "@/hooks/usePeopleWithBirthdays";
import { useTeams, useTeamsByUser } from "@/hooks/useTeams";
import { isTeamLead } from "@/lib/teams/roles";

const NO_DEPT = "__none__";
const SEM_GESTOR = "__none__";

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
  const { data: pessoas = [] } = usePeopleList();
  const { data: times = [] } = useTeams();
  const { data: timesPorPessoa = {} } = useTeamsByUser();

  const [timesEscolhidos, setTimesEscolhidos] = useState<string[]>([]);
  const [buscaGestor, setBuscaGestor] = useState(false);
  const [timesAberto, setTimesAberto] = useState(false);

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
      setTimesEscolhidos((timesPorPessoa[member.user_id] ?? []).map((t) => t.id));
    }
  }, [member, open, form, timesPorPessoa]);

  /** Quem pode ser gestor: qualquer pessoa ativa, menos ela mesma. */
  const candidatosAGestor = useMemo(
    () =>
      pessoas
        .filter((p) => p.status === "active" && p.user_id !== member?.user_id)
        .sort((a, b) => (a.user?.full_name ?? "").localeCompare(b.user?.full_name ?? "")),
    [pessoas, member],
  );

  /** Times agrupados por área, com os squads logo abaixo do time deles. */
  const timesPorArea = useMemo(() => {
    const raizes = times.filter((t) => !t.parent_team_id);
    const areas = new Map<string, { time: typeof times[number]; squads: typeof times }[]>();
    for (const t of raizes) {
      const area = t.department?.trim() || "Sem área";
      const squads = times
        .filter((s) => s.parent_team_id === t.id)
        .sort((a, b) => a.name.localeCompare(b.name));
      if (!areas.has(area)) areas.set(area, []);
      areas.get(area)!.push({ time: t, squads });
    }
    return [...areas.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [times]);

  const nomeDoTime = (id: string) => times.find((t) => t.id === id)?.name ?? "—";

  /** Onde a pessoa lidera hoje — remover esse vínculo tira a liderança do time. */
  const lideraEm = new Set(
    (member ? timesPorPessoa[member.user_id] ?? [] : []).filter((t) => isTeamLead(t.role)).map((t) => t.id),
  );

  const gestorAtual = (id: string) =>
    candidatosAGestor.find((p) => p.user_id === id)?.user?.full_name ?? null;

  const alternarTime = (id: string) =>
    setTimesEscolhidos((atual) =>
      atual.includes(id) ? atual.filter((t) => t !== id) : [...atual, id],
    );

  const onSubmit = async (data: FormData) => {
    if (!member) return;
    await updateMember.mutateAsync({
      membershipId: member.id,
      userId: member.user_id,
      position: data.position,
      department_id: data.department_id === NO_DEPT ? null : data.department_id,
      role: data.role,
      manager_id: data.manager_id === SEM_GESTOR ? null : data.manager_id,
      teamIds: timesEscolhidos,
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
          <div className="flex flex-wrap items-center gap-2 pb-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {member.user?.full_name || member.user?.email}
            </span>
            <span>·</span>
            <span>{member.user?.email}</span>
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

            {/* Gestor: com 130 pessoas, uma lista sem busca é inutilizável. */}
            <FormField
              control={form.control}
              name="manager_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Gestor</FormLabel>
                  <Popover open={buscaGestor} onOpenChange={setBuscaGestor}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "justify-between font-normal",
                            field.value === SEM_GESTOR && "text-muted-foreground",
                          )}
                        >
                          {field.value === SEM_GESTOR
                            ? "Sem gestor"
                            : gestorAtual(field.value) ?? "Sem gestor"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar pessoa..." />
                        <CommandList>
                          <CommandEmpty>Ninguém encontrado.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="sem gestor"
                              onSelect={() => {
                                field.onChange(SEM_GESTOR);
                                setBuscaGestor(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === SEM_GESTOR ? "opacity-100" : "opacity-0",
                                )}
                              />
                              Sem gestor
                            </CommandItem>
                            {candidatosAGestor.map((p) => (
                              <CommandItem
                                key={p.user_id}
                                value={`${p.user?.full_name ?? ""} ${p.user?.email ?? ""}`}
                                onSelect={() => {
                                  field.onChange(p.user_id);
                                  setBuscaGestor(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === p.user_id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {p.user?.full_name ?? p.user?.email}
                                </span>
                                {p.position && (
                                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                                    {p.position}
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    É daqui que sai quem avalia quem no ciclo de desempenho.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Times: até aqui só dava para mover alguém entrando no time e
                adicionando a pessoa lá dentro — nunca a partir da ficha dela. */}
            <FormItem className="flex flex-col">
              <FormLabel>Times e squads</FormLabel>
              <Popover open={timesAberto} onOpenChange={setTimesAberto}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="justify-between font-normal">
                    <span className={cn(!timesEscolhidos.length && "text-muted-foreground")}>
                      {timesEscolhidos.length === 0
                        ? "Nenhum time"
                        : `${timesEscolhidos.length} selecionado${timesEscolhidos.length > 1 ? "s" : ""}`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar time ou squad..." />
                    <CommandList className="max-h-64">
                      <CommandEmpty>Nenhum time encontrado.</CommandEmpty>
                      {timesPorArea.map(([area, itens]) => (
                        <CommandGroup key={area} heading={area}>
                          {itens.map(({ time, squads }) => (
                            <div key={time.id}>
                              <CommandItem
                                value={`${area} ${time.name}`}
                                onSelect={() => alternarTime(time.id)}
                              >
                                <Checkbox
                                  checked={timesEscolhidos.includes(time.id)}
                                  className="mr-2"
                                  tabIndex={-1}
                                />
                                {time.name}
                              </CommandItem>
                              {squads.map((s) => (
                                <CommandItem
                                  key={s.id}
                                  value={`${area} ${time.name} ${s.name}`}
                                  onSelect={() => alternarTime(s.id)}
                                  className="pl-6"
                                >
                                  <Checkbox
                                    checked={timesEscolhidos.includes(s.id)}
                                    className="mr-2"
                                    tabIndex={-1}
                                  />
                                  <span className="text-muted-foreground">↳</span>
                                  <span className="ml-1.5">{s.name}</span>
                                </CommandItem>
                              ))}
                            </div>
                          ))}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {timesEscolhidos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {timesEscolhidos.map((id) => (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1 font-normal">
                      {nomeDoTime(id)}
                      {lideraEm.has(id) && (
                        <span className="text-[10px] text-muted-foreground">líder</span>
                      )}
                      <button
                        type="button"
                        onClick={() => alternarTime(id)}
                        className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                        aria-label={`Remover de ${nomeDoTime(id)}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <FormDescription>
                Dá para estar em mais de um — quem lidera uma frente e atende como
                CFO ocupa duas cadeiras. Tirar de um time onde a pessoa é líder
                deixa o time sem liderança.
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
