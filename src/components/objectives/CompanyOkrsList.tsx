import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, Target, Users, Search, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { QueryError } from "@/components/QueryError";
import { useObjectives, usePeriods, type ObjectiveWithDetails } from "@/hooks/useObjectives";
import { useTeams } from "@/hooks/useTeams";
import { rollup, type WeightOf } from "@/lib/objective-rollup";
import { krProgress } from "@/lib/my-okrs";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type KeyResultRow = Database["public"]["Tables"]["key_results"]["Row"];

// Pesos dos vínculos pai→filho (`objective_relations`) para o rollup ponderado.
// Mesma queryKey do painel de acompanhamento → React Query deduplica a query
// (nenhuma consulta pesada nova). Se falhar/vier vazio, o rollup cai para média
// simples — a lista nunca quebra por ausência de pesos.
function useObjectiveWeights(): WeightOf {
  const { data } = useQuery({
    queryKey: ["objective-relations-weights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("objective_relations")
        .select("child_objective_id, weight_percentage");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const byChild = useMemo(() => {
    const m = new Map<string, number>();
    (data ?? []).forEach((r) => m.set(r.child_objective_id, Number(r.weight_percentage) || 0));
    return m;
  }, [data]);
  return useCallback((childId: string) => byChild.get(childId) ?? 0, [byChild]);
}

/** Todos os KRs de um objetivo, incluindo os dos filhos (recursivo). */
function collectKrs(obj: ObjectiveWithDetails): KeyResultRow[] {
  const own = obj.key_results ?? [];
  const kids = (obj.children ?? []).flatMap(collectKrs);
  return [...own, ...kids];
}

function initials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

/**
 * Linha de um objetivo na hierarquia (Área → Time → …), recursiva e expansível.
 * Mostra título (link para o detalhe), dono, time, progresso (rollup canônico)
 * e a contagem de KRs. Ao expandir, revela os objetivos-filhos e os KRs-folha.
 */
function OkrNodeRow({
  obj,
  weightOf,
  depth,
}: {
  obj: ObjectiveWithDetails;
  weightOf: WeightOf;
  depth: number;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(depth === 0);
  const children = obj.children ?? [];
  const ownKrs = obj.key_results ?? [];
  const krCount = collectKrs(obj).length;
  const { progress: pct } = rollup(obj, weightOf);
  const expandable = children.length > 0 || ownKrs.length > 0;
  const teamName = obj.team?.name ?? null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="flex items-center gap-2 rounded-lg py-2 pr-2 transition-colors hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <CollapsibleTrigger asChild disabled={!expandable}>
          <button
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground",
              expandable ? "hover:text-foreground" : "opacity-0",
            )}
            aria-label={open ? "Recolher" : "Expandir"}
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
          </button>
        </CollapsibleTrigger>

        <button
          onClick={() => navigate(`/objectives/${obj.id}`)}
          className="group flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="truncate text-sm font-medium" title={obj.title}>{obj.title}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </button>

        {obj.owner && (
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            <Avatar className="h-5 w-5">
              <AvatarImage src={obj.owner.avatar_url ?? undefined} />
              <AvatarFallback className="text-[9px]">{initials(obj.owner.full_name)}</AvatarFallback>
            </Avatar>
            <span className="max-w-[8rem] truncate">{obj.owner.full_name || obj.owner.email}</span>
          </span>
        )}

        {teamName && (
          <Badge variant="outline" className="hidden shrink-0 gap-1 font-normal text-muted-foreground sm:flex">
            <Users className="h-3 w-3" />
            {teamName}
          </Badge>
        )}

        <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground lg:flex">
          <Target className="h-3 w-3" />
          {krCount} KR{krCount !== 1 ? "s" : ""}
        </span>

        <div className="flex w-24 shrink-0 items-center gap-2 sm:w-36">
          <Progress value={pct} className="h-2" />
          <span className="w-9 text-right text-xs font-semibold tabular-nums">{pct}%</span>
        </div>
      </div>

      {expandable && (
        <CollapsibleContent>
          {children
            .slice()
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((child) => (
              <OkrNodeRow key={child.id} obj={child} weightOf={weightOf} depth={depth + 1} />
            ))}
          {ownKrs.map((kr) => {
            const kpct = krProgress(kr);
            return (
              <div
                key={kr.id}
                className="flex items-center gap-2 py-1.5 pr-2 text-sm"
                style={{ paddingLeft: `${(depth + 1) * 16 + 28}px` }}
              >
                <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                <span className="min-w-0 flex-1 truncate text-muted-foreground" title={kr.title}>{kr.title}</span>
                <div className="flex w-24 shrink-0 items-center gap-2 sm:w-36">
                  <Progress value={kpct} className="h-1.5" />
                  <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{kpct}%</span>
                </div>
              </div>
            );
          })}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

/**
 * "Empresa" — a hierarquia limpa Área → Time → KRs em lista expansível (na
 * clareza do painel de acompanhamento, não do board). Progresso via rollup
 * canônico; filtros mínimos (período + busca + time); clique leva ao detalhe.
 */
export function CompanyOkrsList() {
  const { data: objectives = [], isLoading, isError, refetch } = useObjectives();
  const { data: periods = [] } = usePeriods();
  const { data: teams = [] } = useTeams();
  const weightOf = useObjectiveWeights();

  const [periodId, setPeriodId] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Período default: o que engloba hoje, senão o mais recente com objetivos.
  const effectivePeriod = useMemo(() => {
    if (periodId) return periodId;
    const withObjs = new Set(objectives.map((o) => o.period_id).filter(Boolean));
    const today = new Date().toISOString().slice(0, 10);
    const current = periods.find(
      (p) => p.start_date <= today && p.end_date >= today && withObjs.has(p.id),
    );
    if (current) return current.id;
    const anyWith = periods.find((p) => withObjs.has(p.id));
    return anyWith?.id ?? "";
  }, [periodId, periods, objectives]);

  // Áreas (roots) do período, com filhos anexados recursivamente.
  const areas = useMemo(() => {
    const byId = new Map(objectives.map((o) => [o.id, { ...o, children: [] as ObjectiveWithDetails[] }]));
    objectives.forEach((o) => {
      if (o.parent_id && byId.has(o.parent_id)) byId.get(o.parent_id)!.children.push(byId.get(o.id)!);
    });
    return Array.from(byId.values())
      .filter((o) => !o.parent_id && (!effectivePeriod || o.period_id === effectivePeriod))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [objectives, effectivePeriod]);

  // Filtro por time: mantém o nó se ele (ou algum descendente) é do time.
  const filterByTeam = useCallback(
    (node: ObjectiveWithDetails): ObjectiveWithDetails | null => {
      const kids = (node.children ?? [])
        .map(filterByTeam)
        .filter(Boolean) as ObjectiveWithDetails[];
      if (teamId === "all" || node.team_id === teamId || kids.length > 0) {
        return { ...node, children: kids };
      }
      return null;
    },
    [teamId],
  );

  // Filtro por busca: casa título, dono, time ou título de KR próprio; mantém
  // ancestrais de qualquer nó que casar.
  const filterBySearch = useCallback(
    (node: ObjectiveWithDetails): ObjectiveWithDetails | null => {
      const q = search.trim().toLowerCase();
      const kids = (node.children ?? [])
        .map(filterBySearch)
        .filter(Boolean) as ObjectiveWithDetails[];
      const selfMatch =
        q === "" ||
        node.title.toLowerCase().includes(q) ||
        node.owner?.full_name?.toLowerCase().includes(q) ||
        node.owner?.email?.toLowerCase().includes(q) ||
        node.team?.name?.toLowerCase().includes(q) ||
        (node.key_results ?? []).some((kr) => kr.title.toLowerCase().includes(q));
      if (selfMatch || kids.length > 0) return { ...node, children: kids };
      return null;
    },
    [search],
  );

  const visibleAreas = useMemo(() => {
    return areas
      .map(filterByTeam)
      .filter(Boolean)
      .map((a) => filterBySearch(a as ObjectiveWithDetails))
      .filter(Boolean) as ObjectiveWithDetails[];
  }, [areas, filterByTeam, filterBySearch]);

  return (
    <div className="space-y-4">
      {/* Filtros mínimos: período + busca + time */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={effectivePeriod} onValueChange={setPeriodId}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Período" /></SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Time" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os times</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar objetivo, dono ou KR..."
            className="pl-9"
          />
        </div>
      </div>

      {isError ? (
        <QueryError
          message="Não foi possível carregar os OKRs da empresa."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}
        </div>
      ) : visibleAreas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {search || teamId !== "all"
              ? "Nenhum objetivo corresponde aos filtros."
              : "Nenhum objetivo neste período."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-2">
            {visibleAreas.map((area) => (
              <OkrNodeRow key={area.id} obj={area} weightOf={weightOf} depth={0} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
