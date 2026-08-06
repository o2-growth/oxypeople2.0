import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Users, ChevronRight, Settings2, Layers, ArrowLeft, Building2, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Team } from "@/hooks/useTeams";

interface TeamTreeProps {
  teams: Team[];
  memberCounts: Record<string, number>;
  onManageMembers: (team: Team) => void;
  onEdit: (team: Team) => void;
  onDelete?: (team: Team) => void;
  /** Busca ativa: mostra tudo de uma vez, sem exigir navegar até o item. */
  isSearching?: boolean;
}

const CORES: Record<string, string> = {
  Revenue: "bg-violet-500",
  Operação: "bg-emerald-600",
  Backoffice: "bg-sky-500",
  Tecnologia: "bg-amber-500",
  Diretoria: "bg-slate-500",
};

/**
 * Navegação em três passos: áreas → times da área → squads do time.
 *
 * A tela anterior listava tudo junto numa grade: 17 times e 13 squads como
 * irmãos, o que dava 30 cartões sem hierarquia visível. Navegar por nível
 * mantém a lista curta e deixa claro a que cada coisa pertence.
 *
 * Durante uma busca a navegação é ignorada e o resultado aparece plano — quem
 * digita já sabe o que procura e não deveria ter que achar a área antes.
 */
export function TeamTree({
  teams, memberCounts, onManageMembers, onEdit, onDelete, isSearching,
}: TeamTreeProps) {
  const [areaAberta, setAreaAberta] = useState<string | null>(null);
  const [timeAberto, setTimeAberto] = useState<string | null>(null);

  const dados = useMemo(() => {
    const times = teams.filter((t) => !t.parent_team_id);
    const squadsDe = (id: string) =>
      teams
        .filter((s) => s.parent_team_id === id)
        .sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name));

    // O total do time inclui quem está nos squads: contar só o vínculo direto
    // mostraria "0" no CAAS, cujas 15 pessoas estão todas em squads.
    const totalDoTime = (t: Team) =>
      (memberCounts[t.id] ?? 0) + squadsDe(t.id).reduce((a, s) => a + (memberCounts[s.id] ?? 0), 0);

    const areas = new Map<string, Team[]>();
    for (const t of times) {
      const area = t.department?.trim() || "Sem área";
      if (!areas.has(area)) areas.set(area, []);
      areas.get(area)!.push(t);
    }

    return {
      squadsDe,
      totalDoTime,
      areas: [...areas.entries()]
        .map(([nome, lista]) => ({
          nome,
          times: lista.sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name)),
          pessoas: lista.reduce((a, t) => a + totalDoTime(t), 0),
          squads: lista.reduce((a, t) => a + squadsDe(t.id).length, 0),
        }))
        .sort((a, b) => b.pessoas - a.pessoas),
    };
  }, [teams, memberCounts]);

  // ---- busca: resultado plano ----
  if (isSearching) {
    if (!teams.length) {
      return <EmptyState icon={Search} title="Nenhum time encontrado" description="Tente buscar com outros termos." />;
    }
    return (
      <div className="space-y-2">
        {teams.map((t) => (
          <LinhaTime
            key={t.id} team={t}
            total={t.parent_team_id ? memberCounts[t.id] ?? 0 : dados.totalDoTime(t)}
            squads={t.parent_team_id ? 0 : dados.squadsDe(t.id).length}
            caminho={t.department ?? undefined}
            onManageMembers={onManageMembers} onEdit={onEdit} onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  const area = dados.areas.find((a) => a.nome === areaAberta);
  const time = area?.times.find((t) => t.id === timeAberto);
  const squads = time ? dados.squadsDe(time.id) : [];

  // ---- nível 3: squads do time ----
  if (time) {
    return (
      <div className="space-y-4">
        <Trilha
          itens={[
            { label: "Áreas", onClick: () => { setAreaAberta(null); setTimeAberto(null); } },
            { label: area!.nome, onClick: () => setTimeAberto(null) },
            { label: time.name },
          ]}
          onVoltar={() => setTimeAberto(null)}
        />

        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{time.name}</h2>
            {time.description && <p className="text-sm text-muted-foreground">{time.description}</p>}
          </div>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {dados.totalDoTime(time)} no time
          </span>
          <Button variant="outline" size="sm" onClick={() => onManageMembers(time)}>
            Membros do time
          </Button>
        </div>

        {squads.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Sem squads"
            description="Este time não tem subdivisões. As pessoas ficam direto nele."
          />
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {squads.length} {squads.length === 1 ? "squad" : "squads"}
            </p>
            {squads.map((s) => (
              <LinhaTime
                key={s.id} team={s} total={memberCounts[s.id] ?? 0} squads={0}
                onManageMembers={onManageMembers} onEdit={onEdit} onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- nível 2: times da área ----
  if (area) {
    return (
      <div className="space-y-4">
        <Trilha
          itens={[{ label: "Áreas", onClick: () => setAreaAberta(null) }, { label: area.nome }]}
          onVoltar={() => setAreaAberta(null)}
        />

        <div className="flex items-center gap-3">
          <span className={cn("h-8 w-1.5 rounded-full", CORES[area.nome] ?? "bg-muted-foreground")} />
          <div>
            <h2 className="text-lg font-semibold">{area.nome}</h2>
            <p className="text-sm text-muted-foreground">
              {area.times.length} {area.times.length === 1 ? "time" : "times"} · {area.pessoas}{" "}
              {area.pessoas === 1 ? "pessoa" : "pessoas"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {area.times.map((t) => {
            const qtdSquads = dados.squadsDe(t.id).length;
            return (
              <LinhaTime
                key={t.id} team={t} total={dados.totalDoTime(t)} squads={qtdSquads}
                onAbrir={qtdSquads > 0 ? () => setTimeAberto(t.id) : undefined}
                onManageMembers={onManageMembers} onEdit={onEdit} onDelete={onDelete}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ---- nível 1: áreas ----
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {dados.areas.map((a) => (
        <Card
          key={a.nome}
          onClick={() => setAreaAberta(a.nome)}
          className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <span className={cn("mt-1 h-10 w-1.5 shrink-0 rounded-full", CORES[a.nome] ?? "bg-muted-foreground")} />
              <div className="min-w-0 flex-1">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {a.nome}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.times.length} {a.times.length === 1 ? "time" : "times"}
                  {a.squads > 0 && ` · ${a.squads} ${a.squads === 1 ? "squad" : "squads"}`}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{a.pessoas}</span>
                    <span className="text-muted-foreground">
                      {a.pessoas === 1 ? "pessoa" : "pessoas"}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-primary" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Trilha({
  itens, onVoltar,
}: { itens: { label: string; onClick?: () => void }[]; onVoltar: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={onVoltar}>
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        {itens.map((i, n) => (
          <span key={i.label} className="flex items-center gap-1">
            {n > 0 && <ChevronRight className="h-3.5 w-3.5" />}
            {i.onClick ? (
              <button onClick={i.onClick} className="hover:text-foreground hover:underline">
                {i.label}
              </button>
            ) : (
              <span className="font-medium text-foreground">{i.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}

function LinhaTime({
  team, total, squads, caminho, onAbrir, onManageMembers, onEdit, onDelete,
}: {
  team: Team; total: number; squads: number; caminho?: string;
  onAbrir?: () => void;
  onManageMembers: (t: Team) => void; onEdit: (t: Team) => void; onDelete?: (t: Team) => void;
}) {
  return (
    <div
      onClick={onAbrir}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        onAbrir && "cursor-pointer hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{team.name}</span>
          {team.status === "building" && (
            <Badge variant="outline" className="text-[11px]">em construção</Badge>
          )}
          {squads > 0 && (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              <Layers className="h-3 w-3" />
              {squads} {squads === 1 ? "squad" : "squads"}
            </Badge>
          )}
          {caminho && <span className="text-xs text-muted-foreground">· {caminho}</span>}
        </div>
        {team.description && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{team.description}</p>
        )}
      </div>

      <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        {total}
      </span>

      <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" onClick={() => onManageMembers(team)}>
          Membros
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(team)}>
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      {onAbrir && <ChevronRight className="h-4 w-4 shrink-0 text-primary" />}
    </div>
  );
}
