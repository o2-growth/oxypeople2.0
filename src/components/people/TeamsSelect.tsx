import { useMemo, useState } from "react";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeams, useTeamsByUser } from "@/hooks/useTeams";
import { isTeamLead } from "@/lib/teams/roles";

interface TeamsSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  /** De quem é a ficha — usado para marcar onde a pessoa lidera. */
  userId?: string;
  disabled?: boolean;
}

/**
 * Times e squads de uma pessoa, escolhidos a partir da ficha dela.
 *
 * Antes o único caminho era entrar no time e adicionar a pessoa lá dentro, o
 * que obriga a saber de antemão para onde ela vai. Aqui a lista aparece
 * agrupada por área, com os squads recuados sob o time a que pertencem.
 *
 * Aceita mais de um de propósito: quem lidera uma frente e ainda atende como
 * CFO ocupa duas cadeiras de verdade.
 */
export function TeamsSelect({ value, onChange, userId, disabled }: TeamsSelectProps) {
  const [aberto, setAberto] = useState(false);
  const { data: times = [] } = useTeams();
  const { data: timesPorPessoa = {} } = useTeamsByUser();

  const porArea = useMemo(() => {
    const raizes = times.filter((t) => !t.parent_team_id);
    const areas = new Map<string, { time: (typeof times)[number]; squads: typeof times }[]>();
    for (const t of raizes) {
      const area = t.department?.trim() || "Sem área";
      const squads = times
        .filter((s) => s.parent_team_id === t.id)
        .sort((a, b) => a.name.localeCompare(b.name));
      if (!areas.has(area)) areas.set(area, []);
      areas.get(area)!.push({ time: t, squads });
    }
    for (const lista of areas.values()) lista.sort((a, b) => a.time.name.localeCompare(b.time.name));
    return [...areas.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [times]);

  const nomeDoTime = (id: string) => times.find((t) => t.id === id)?.name ?? "—";

  const lidera = useMemo(
    () =>
      new Set(
        (userId ? timesPorPessoa[userId] ?? [] : [])
          .filter((t) => isTeamLead(t.role))
          .map((t) => t.id),
      ),
    [timesPorPessoa, userId],
  );

  const alternar = (id: string) =>
    onChange(value.includes(id) ? value.filter((t) => t !== id) : [...value, id]);

  return (
    <div className="space-y-2">
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className={cn(!value.length && "text-muted-foreground")}>
              {value.length === 0
                ? "Nenhum time"
                : `${value.length} selecionado${value.length > 1 ? "s" : ""}`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar time ou squad..." />
            <CommandList className="max-h-64">
              <CommandEmpty>Nenhum time encontrado.</CommandEmpty>
              {porArea.map(([area, itens]) => (
                <CommandGroup key={area} heading={area}>
                  {itens.map(({ time, squads }) => (
                    <div key={time.id}>
                      <CommandItem value={`${area} ${time.name}`} onSelect={() => alternar(time.id)}>
                        <Checkbox checked={value.includes(time.id)} className="mr-2" tabIndex={-1} />
                        {time.name}
                      </CommandItem>
                      {squads.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={`${area} ${time.name} ${s.name}`}
                          onSelect={() => alternar(s.id)}
                          className="pl-6"
                        >
                          <Checkbox checked={value.includes(s.id)} className="mr-2" tabIndex={-1} />
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

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 pr-1 font-normal">
              {nomeDoTime(id)}
              {lidera.has(id) && <span className="text-[10px] text-muted-foreground">líder</span>}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => alternar(id)}
                  className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                  aria-label={`Remover de ${nomeDoTime(id)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
