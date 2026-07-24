import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useObjectives, usePeriods, type ObjectiveWithDetails } from "@/hooks/useObjectives";
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

function avgProgress(krs: KeyResultRow[]): number {
  if (!krs.length) return 0;
  return Math.round(krs.reduce((s, k) => s + krProgress(k), 0) / krs.length);
}

// Todos os KRs de um objetivo, incluindo os dos filhos (recursivo).
function collectKrs(obj: ObjectiveWithDetails): KeyResultRow[] {
  const own = obj.key_results ?? [];
  const kids = (obj.children ?? []).flatMap(collectKrs);
  return [...own, ...kids];
}

const AREA_COLORS: Record<string, string> = {
  Operações: "#F97316",
  Revenue: "#3B82F6",
  Tech: "#6B7280",
};
function areaColor(title: string): string {
  const key = Object.keys(AREA_COLORS).find((k) => title.includes(k));
  return key ? AREA_COLORS[key] : "#10B981";
}

function progressTone(pct: number, hasCheckin: boolean): { label: string; cls: string } {
  if (!hasCheckin) return { label: "Sem check-in", cls: "bg-muted text-muted-foreground" };
  if (pct >= 70) return { label: "No alvo", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" };
  if (pct >= 40) return { label: "Atenção", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
  return { label: "Em risco", cls: "bg-red-500/15 text-red-600 dark:text-red-400" };
}

function initials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function TeamRow({ team }: { team: ObjectiveWithDetails }) {
  const [open, setOpen] = useState(false);
  const krs = team.key_results ?? [];
  const pct = avgProgress(krs);
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
            <Progress value={pct} className="h-2" />
            <span className="w-9 text-right text-xs font-semibold tabular-nums">{pct}%</span>
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

function AreaCard({ area }: { area: ObjectiveWithDetails }) {
  const navigate = useNavigate();
  const teams = (area.children ?? []).filter((c) => c.type === "operational" || (c.children?.length ?? 0) === 0);
  const allKrs = collectKrs(area);
  const pct = avgProgress(allKrs);
  const color = areaColor(area.title);
  const areaName = area.title.replace(/\s+—.*$/, "");

  return (
    <Card className="overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: color }} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <button
              onClick={() => navigate(`/objectives/${area.id}`)}
              className="group flex items-center gap-2 text-left"
            >
              <h2 className="truncate text-lg font-heading font-bold">{areaName}</h2>
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
            <span className="text-xs text-muted-foreground">progresso</span>
          </div>
        </div>
        <Progress value={pct} className="mt-2 h-2" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-0.5">
          {teams
            .slice()
            .sort((a, b) => (b.key_results?.length ?? 0) - (a.key_results?.length ?? 0))
            .map((team) => (
              <TeamRow key={team.id} team={team} />
            ))}
          {!teams.length && <p className="py-2 text-sm text-muted-foreground">Nenhum time neste objetivo.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OkrOverview() {
  const { data: objectives = [], isLoading } = useObjectives();
  const { data: periods = [] } = usePeriods();
  const [periodId, setPeriodId] = useState<string>("");

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
    const krs = areas.flatMap(collectKrs);
    const teams = areas.reduce((s, a) => s + (a.children?.length ?? 0), 0);
    return { objetivos: areas.length, times: teams, krs: krs.length, progresso: avgProgress(krs) };
  }, [areas]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-heading font-bold">
              <TrendingUp className="h-6 w-6 text-primary" />
              Acompanhamento de OKRs
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Visão consolidada por área e time para gestão e cobrança.
            </p>
          </div>
          <Select value={effectivePeriod} onValueChange={setPeriodId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        ) : areas.length ? (
          <div className="space-y-4">
            {areas.map((area) => <AreaCard key={area.id} area={area} />)}
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
