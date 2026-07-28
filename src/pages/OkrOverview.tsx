import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, Target, Users, TrendingUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryError } from "@/components/QueryError";
import { useObjectives, usePeriods, type ObjectiveWithDetails } from "@/hooks/useObjectives";
import { rollup, type WeightOf } from "@/lib/objective-rollup";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useDriverTour } from "@/hooks/useDriverTour";
import { OKR_OVERVIEW_TOUR_ID, okrOverviewSteps } from "@/lib/tours";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type KeyResultRow = Database["public"]["Tables"]["key_results"]["Row"];

// Progresso de um KR (0-100), respeitando direção e tipo.
function krProgress(kr: KeyResultRow): number {
  const target = Number(kr.target_value ?? 0);
  const current = Number(kr.current_value ?? 0);
  const initial = Number(kr.initial_value ?? 0);
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  if (kr.kr_type === "binary") return current >= target ? 100 : 0;
  if (kr.direction === "down") {
    const span = initial - target;
    if (span === 0) return current <= target ? 100 : 0;
    return clamp(((initial - current) / span) * 100);
  }
  const span = target - initial;
  if (span === 0) return current >= target ? 100 : 0;
  return clamp(((current - initial) / span) * 100);
}

// Pesos dos vínculos pai→filho (`objective_relations`). Uma única query
// (dedup por react-query) alimenta o rollup ponderado. Se o RLS retornar vazio
// ou a query falhar, o mapa fica vazio e `weightedMean` cai para média simples
// — o painel nunca quebra por ausência de pesos.
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

// Todos os KRs de um objetivo, incluindo os dos filhos (recursivo).
function collectKrs(obj: ObjectiveWithDetails): KeyResultRow[] {
  const own = obj.key_results ?? [];
  const kids = (obj.children ?? []).flatMap(collectKrs);
  return [...own, ...kids];
}

// Cores por área derivadas de CSS vars do design system (definidas em
// src/index.css como `--okr-area-*`). O hex real vive no token; aqui só o
// mapa tipado, local a esta página (não é util compartilhado). Cada área
// conserva exatamente a cor que já tinha.
type AreaKey = "ops" | "revenue" | "tech" | "default";
const AREA_COLORS: Record<AreaKey, string> = {
  ops: "var(--okr-area-ops)",
  revenue: "var(--okr-area-revenue)",
  tech: "var(--okr-area-tech)",
  default: "var(--okr-area-default)",
};
// Casa a cor por um campo mais estável (`department`) quando disponível, com o
// título apenas como fallback — assim renomear o título não perde a cor da área.
// Sem um mapeamento id→cor no schema, o casamento segue textual; um campo
// dedicado exigiria mudança de schema (fora do escopo desta onda).
function areaColorKey(area: ObjectiveWithDetails): AreaKey {
  const haystack = `${area.department ?? ""} ${area.title}`;
  if (haystack.includes("Operações")) return "ops";
  if (haystack.includes("Revenue")) return "revenue";
  if (haystack.includes("Tech")) return "tech";
  return "default";
}

function progressTone(pct: number, hasCheckin: boolean): { label: string; cls: string } {
  if (!hasCheckin) return { label: "Sem check-in", cls: "bg-muted text-muted-foreground" };
  if (pct >= 70) return { label: "No alvo", cls: "bg-success/15 text-success" };
  if (pct >= 40) return { label: "Atenção", cls: "bg-warning/15 text-warning" };
  return { label: "Em risco", cls: "bg-destructive/15 text-destructive" };
}

function initials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// Barra de progresso REAL com marcador do ESPERADO (barra dupla — §3.4). O
// preenchimento é o progresso real; o traço vertical marca o esperado do pace.
// Atrás do esperado → marcador em tom de alerta (`warning`); no alvo/à frente →
// marcador neutro. Mantém track/altura/gradiente iguais aos da <Progress> do
// design system (tudo via token, sem cor hardcoded).
function DualProgress({ value, expected, className }: { value: number; expected: number; className?: string }) {
  const behind = value < expected;
  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-full bg-secondary", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progresso ${value}%, esperado ${expected}%`}
      title={`Real ${value}% · Esperado ${expected}%`}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${value}%`, backgroundImage: "var(--gradient-progress)" }}
      />
      <span
        aria-hidden
        className={cn("absolute top-0 h-full w-0.5 -translate-x-1/2", behind ? "bg-warning" : "bg-foreground/40")}
        style={{ left: `${expected}%` }}
      />
    </div>
  );
}

// Barra do nó: dupla quando há esperado > 0, simples caso contrário.
function NodeProgress({ value, expected, className }: { value: number; expected: number; className?: string }) {
  return expected > 0
    ? <DualProgress value={value} expected={expected} className={className} />
    : <Progress value={value} className={className} />;
}

function TeamRow({ team, weightOf }: { team: ObjectiveWithDetails; weightOf: WeightOf }) {
  const [open, setOpen] = useState(false);
  const krs = team.key_results ?? [];
  const { progress: pct, expected } = rollup(team, weightOf);
  const behind = expected > 0 && pct < expected;
  const hasCheckin = krs.some((k) => k.last_checkin_at || Number(k.current_value ?? 0) > 0);
  const tone = progressTone(pct, hasCheckin);
  const teamName = team.team?.name || team.title.replace(/^OKR\s+/, "").replace(/\s+—.*$/, "");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/60">
          <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-medium">{teamName}</span>
          <span className="text-xs text-muted-foreground">{krs.length} KR{krs.length !== 1 ? "s" : ""}</span>
          <Badge variant="outline" className={cn("border-0 text-xs font-medium", tone.cls)}>{tone.label}</Badge>
          <div className="hidden w-40 items-center gap-2 sm:flex">
            <NodeProgress value={pct} expected={expected} className="h-2" />
            <span className={cn("w-9 text-right text-xs font-semibold tabular-nums", behind && "text-warning")}>{pct}%</span>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-9 mb-1 space-y-1 border-l border-border pl-4">
          {krs.map((kr) => {
            const kpct = krProgress(kr);
            return (
              <div key={kr.id} className="flex items-center gap-3 py-1.5 text-sm">
                <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                <span className="min-w-0 flex-1 truncate" title={kr.title}>{kr.title}</span>
                <div className="flex w-32 items-center gap-2">
                  <Progress value={kpct} className="h-1.5" />
                  <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{kpct}%</span>
                </div>
              </div>
            );
          })}
          {!krs.length && <p className="py-2 text-sm text-muted-foreground">Sem KRs.</p>}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AreaCard({
  area,
  weightOf,
  isTourAnchor = false,
}: {
  area: ObjectiveWithDetails;
  weightOf: WeightOf;
  /** Marca ESTE card como âncora do tour (§3.7). Só o primeiro card recebe. */
  isTourAnchor?: boolean;
}) {
  const navigate = useNavigate();
  const teams = (area.children ?? []).filter((c) => c.type === "operational" || (c.children?.length ?? 0) === 0);
  const allKrs = collectKrs(area);
  const { progress: pct, expected } = rollup(area, weightOf);
  const behind = expected > 0 && pct < expected;
  const color = AREA_COLORS[areaColorKey(area)];
  const areaName = area.title.replace(/\s+—.*$/, "");

  return (
    <Card className="overflow-hidden" data-tour={isTourAnchor ? "okr-area" : undefined}>
      <div className="h-1.5" style={{ backgroundColor: color }} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <button
              onClick={() => navigate(`/objectives/${area.id}`)}
              className="group flex items-center gap-2 text-left"
            >
              <h2 className="truncate text-lg font-bold">{areaName}</h2>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              {area.owner && (
                <span className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={area.owner.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">{initials(area.owner.full_name)}</AvatarFallback>
                  </Avatar>
                  {area.owner.full_name}
                </span>
              )}
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{teams.length} times</span>
              <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" />{allKrs.length} KRs</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="text-2xl font-bold tabular-nums" style={{ color }}>{pct}%</span>
            {expected > 0 ? (
              <span className={cn("text-xs", behind ? "text-warning" : "text-muted-foreground")}>
                esperado {expected}%{behind ? " · atrás" : ""}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">progresso</span>
            )}
          </div>
        </div>
        <div className="mt-2" data-tour={isTourAnchor ? "okr-progress" : undefined}>
          <NodeProgress value={pct} expected={expected} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-0.5">
          {teams
            .slice()
            .sort((a, b) => (b.key_results?.length ?? 0) - (a.key_results?.length ?? 0))
            .map((team) => (
              <TeamRow key={team.id} team={team} weightOf={weightOf} />
            ))}
          {!teams.length && <p className="py-2 text-sm text-muted-foreground">Nenhum time neste objetivo.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OkrOverview() {
  const { data: objectives = [], isLoading, isError, refetch } = useObjectives();
  const { data: periods = [] } = usePeriods();
  const weightOf = useObjectiveWeights();
  const [periodId, setPeriodId] = useState<string>("");

  // Tour de primeiro acesso (§3.7). Aditivo ao painel do §3.4 — só dispara o
  // trigger e usa os `data-tour` mínimos; não altera o cálculo de rollup.
  const { isAdmin, isTeamLeader, canManageOkrCascade, isLoading: permsLoading } =
    useUserPermissions();
  const okrTour = useDriverTour(OKR_OVERVIEW_TOUR_ID, okrOverviewSteps);
  const okrTourStarted = useRef(false);
  // Gate por papel: gestores (líderes de time / acesso manager) e admins.
  const canSeeOkrTour = isAdmin || isTeamLeader || canManageOkrCascade;

  // período default: o que engloba hoje, senão o mais recente com objetivos.
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

  // Áreas (roots strategic) do período selecionado, com filhos anexados.
  const areas = useMemo(() => {
    const byId = new Map(objectives.map((o) => [o.id, { ...o, children: [] as ObjectiveWithDetails[] }]));
    objectives.forEach((o) => {
      if (o.parent_id && byId.has(o.parent_id)) byId.get(o.parent_id)!.children.push(byId.get(o.id)!);
    });
    return Array.from(byId.values())
      .filter((o) => !o.parent_id && (!effectivePeriod || o.period_id === effectivePeriod))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [objectives, effectivePeriod]);

  const totals = useMemo(() => {
    const teams = areas.reduce((s, a) => s + (a.children?.length ?? 0), 0);
    const krCount = areas.reduce((s, a) => s + collectKrs(a).length, 0);
    // Progresso médio = média do rollup (§3.4) de cada área, mantendo o headline
    // coerente com o número exibido em cada card.
    const areaPcts = areas.map((a) => rollup(a, weightOf).progress);
    const progresso = areaPcts.length
      ? Math.round(areaPcts.reduce((s, p) => s + p, 0) / areaPcts.length)
      : 0;
    return { objetivos: areas.length, times: teams, krs: krCount, progresso };
  }, [areas, weightOf]);

  // Auto-start UMA vez: gestor/admin, dados carregados e com áreas na tela
  // (garante que os alvos period/summary/area já montaram). A flag por tour
  // (`tour:okr-overview:v1`) impede repetição; o tour é 100% skipável.
  useEffect(() => {
    if (okrTourStarted.current) return;
    if (permsLoading || isLoading) return;
    if (!canSeeOkrTour || areas.length === 0) return;
    okrTourStarted.current = true;
    const t = window.setTimeout(() => okrTour.start(), 350);
    return () => window.clearTimeout(t);
  }, [permsLoading, isLoading, canSeeOkrTour, areas.length, okrTour]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <PageHeader
          title="Acompanhamento de OKRs"
          description="Visão consolidada por área e time para gestão e cobrança."
          icon={TrendingUp}
          actions={
            <Select value={effectivePeriod} onValueChange={setPeriodId}>
              <SelectTrigger className="w-48" data-tour="okr-period"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-tour="okr-summary">
          {[
            { label: "Áreas", value: totals.objetivos, icon: Target },
            { label: "Times", value: totals.times, icon: Users },
            { label: "Key Results", value: totals.krs, icon: Target },
            { label: "Progresso médio", value: `${totals.progresso}%`, icon: TrendingUp },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-primary/10 p-2"><s.icon className="h-4 w-4 text-primary" /></div>
                <div>
                  <div className="text-xl font-bold tabular-nums">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Áreas */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="p-4">
              <QueryError
                message="Não foi possível carregar os OKRs."
                onRetry={() => refetch()}
              />
            </CardContent>
          </Card>
        ) : areas.length ? (
          <div className="space-y-4">
            {areas.map((area, i) => (
              <AreaCard key={area.id} area={area} weightOf={weightOf} isTourAnchor={i === 0} />
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            Nenhum objetivo neste período.
          </CardContent></Card>
        )}
      </div>
    </AppLayout>
  );
}
