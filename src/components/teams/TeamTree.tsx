import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight, Settings2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Team } from "@/hooks/useTeams";

interface TeamTreeProps {
  teams: Team[];
  memberCounts: Record<string, number>;
  onManageMembers: (team: Team) => void;
  onEdit: (team: Team) => void;
}

/**
 * Times e squads agrupados por área.
 *
 * A listagem anterior era uma grade plana: os 13 squads apareciam como irmãos
 * dos times, sem indicar a quem pertencem. Área → Time → Squad é a estrutura
 * real da empresa, e é o que precisa aparecer.
 */
export function TeamTree({ teams, memberCounts, onManageMembers, onEdit }: TeamTreeProps) {
  const porArea = useMemo(() => {
    const times = teams.filter((t) => !t.parent_team_id);
    const squadsDe = (id: string) =>
      teams
        .filter((s) => s.parent_team_id === id)
        .sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name));

    const areas = new Map<string, Team[]>();
    for (const t of times) {
      const area = t.department?.trim() || "Sem área";
      if (!areas.has(area)) areas.set(area, []);
      areas.get(area)!.push(t);
    }

    return [...areas.entries()]
      .map(([area, lista]) => {
        const comSquads = lista
          .sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name))
          .map((time) => {
            const squads = squadsDe(time.id);
            // O total do time inclui quem está nos squads: contar só o vínculo
            // direto mostraria "0" num time cujo trabalho está todo nos squads.
            const direto = memberCounts[time.id] ?? 0;
            const total = direto + squads.reduce((a, s) => a + (memberCounts[s.id] ?? 0), 0);
            return { time, squads, direto, total };
          });
        const totalArea = comSquads.reduce((a, t) => a + t.total, 0);
        return { area, times: comSquads, totalArea };
      })
      .sort((a, b) => b.totalArea - a.totalArea);
  }, [teams, memberCounts]);

  return (
    <div className="space-y-8">
      {porArea.map(({ area, times, totalArea }) => (
        <section key={area}>
          <div className="mb-3 flex items-baseline gap-2 border-b pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {area}
            </h2>
            <span className="text-xs text-muted-foreground">
              {times.length} {times.length === 1 ? "time" : "times"} · {totalArea}{" "}
              {totalArea === 1 ? "pessoa" : "pessoas"}
            </span>
          </div>

          <div className="space-y-2">
            {times.map(({ time, squads, direto, total }) => (
              <div key={time.id} className="rounded-lg border">
                <div className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{time.name}</span>
                      {time.status === "building" && (
                        <Badge variant="outline" className="text-[11px]">em construção</Badge>
                      )}
                      {squads.length > 0 && (
                        <Badge variant="secondary" className="gap-1 text-[11px]">
                          <Layers className="h-3 w-3" />
                          {squads.length} {squads.length === 1 ? "squad" : "squads"}
                        </Badge>
                      )}
                    </div>
                    {time.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{time.description}</p>
                    )}
                  </div>

                  <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {total}
                    {squads.length > 0 && direto > 0 && (
                      <span className="text-xs">({direto} direto)</span>
                    )}
                  </span>

                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onManageMembers(time)}>
                      Membros
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(time)}>
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {squads.length > 0 && (
                  <div className="border-t bg-muted/30 px-3 py-2">
                    {squads.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 py-1.5">
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className={cn("flex-1 truncate text-sm", s.status === "building" && "text-muted-foreground")}>
                          {s.name}
                        </span>
                        {s.status === "building" && (
                          <Badge variant="outline" className="text-[10px]">em construção</Badge>
                        )}
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {memberCounts[s.id] ?? 0}
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onManageMembers(s)}>
                          Membros
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
