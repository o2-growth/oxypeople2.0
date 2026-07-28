import { useState } from "react";
import { StatCard } from "@/components/o2/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { EngagementChart } from "@/components/dashboard/EngagementChart";
import { BirthdaysWidget } from "@/components/dashboard/BirthdaysWidget";
import { TopRecognizedWidget } from "@/components/dashboard/TopRecognizedWidget";
import { ShortcutCards } from "@/components/dashboard/ShortcutCards";
import { CollaboratorsDetailDialog } from "@/components/dashboard/CollaboratorsDetailDialog";
import { RecognitionsDetailDialog } from "@/components/dashboard/RecognitionsDetailDialog";
import { ObjectivesDetailDialog } from "@/components/dashboard/ObjectivesDetailDialog";
import { EngagementDetailDialog } from "@/components/dashboard/EngagementDetailDialog";
import { OKRStatusSummary } from "@/components/dashboard/OKRStatusSummary";
import { NPSPerformanceRow } from "@/components/dashboard/NPSPerformanceRow";
import { WeeklyActionsCard } from "@/components/dashboard/WeeklyActionsCard";
import { HeadcountSparkline } from "@/components/dashboard/HeadcountSparkline";
import { UserGamificationMini } from "@/components/dashboard/UserGamificationMini";
import { TurnoverMini } from "@/components/dashboard/TurnoverMini";
import { Users, Trophy, Target, TrendingUp, MessageSquare, CheckCircle2, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/QueryError";
import { cn } from "@/lib/utils";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useDashboardFullStats } from "@/hooks/useDashboardFullStats";
import { useQuarterGoals } from "@/hooks/useQuarterGoals";

/**
 * Visão da empresa (Onda 2, preservada). Renderizada apenas para gestores/admins
 * na Home por papel (Onda 3 — §3.2). As queries pesadas de dashboard
 * (useDashboardStats/FullStats/useQuarterGoals) só disparam quando este
 * componente é montado — colaboradores não pagam esse custo.
 */
export function CompanyOverview() {
  const {
    data: stats,
    isLoading: isLoadingStats,
    isError: isErrorStats,
    refetch: refetchStats,
  } = useDashboardStats();
  const {
    data: fullStats,
    isLoading: isLoadingFull,
    isError: isErrorFull,
    refetch: refetchFull,
  } = useDashboardFullStats();
  const {
    data: quarterGoals,
    isLoading: isLoadingGoals,
    isError: isErrorGoals,
    refetch: refetchGoals,
  } = useQuarterGoals();
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  const statsData = [
    {
      title: "Total de Colaboradores",
      value: stats?.totalCollaborators || 0,
      change: stats?.collaboratorsChange || 0,
      changeLabel: "este mês",
      icon: <Users className="h-6 w-6" />,
      colorClass: "bg-gradient-primary",
      dialogKey: "collaborators",
    },
    {
      title: "Reconhecimentos",
      value: stats?.recognitionsThisMonth || 0,
      change: stats?.recognitionsChange || 0,
      changeLabel: "vs último mês",
      icon: <Trophy className="h-6 w-6" />,
      colorClass: "bg-gradient-accent",
      dialogKey: "recognitions",
    },
    {
      title: "Objetivos Concluídos",
      value: stats?.objectivesCompletionRate || 0,
      suffix: "%",
      change: stats?.objectivesChange || 0,
      changeLabel: "vs último trimestre",
      icon: <Target className="h-6 w-6" />,
      colorClass: "bg-gradient-warm",
      dialogKey: "objectives",
    },
    {
      title: "Engajamento",
      value: stats?.engagementRate || 0,
      suffix: "%",
      change: stats?.engagementChange || 0,
      changeLabel: "vs último mês",
      icon: <TrendingUp className="h-6 w-6" />,
      colorClass: "bg-gradient-success",
      dialogKey: "engagement",
    },
  ];

  const quickStatsData = [
    { label: "Posts hoje", value: stats?.postsToday || 0, icon: <MessageSquare className="h-4 w-4" /> },
    { label: "Objetivos concluídos", value: stats?.completedObjectivesToday || 0, icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Visão da empresa</h2>
        <p className="text-sm text-muted-foreground">
          Indicadores e atividade da organização.
        </p>
      </div>

      {/* Stats Grid */}
      {isErrorStats ? (
        <QueryError
          message="Não foi possível carregar os indicadores principais."
          onRetry={() => refetchStats()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoadingStats ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="stat-card">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-xl" />
                </div>
              </div>
            ))
          ) : (
            statsData.map((stat, index) => (
              <div
                key={stat.title}
                className={cn("animate-slide-up opacity-0", index > 0 && `stagger-${index}`)}
              >
                <StatCard {...stat} onClick={() => setOpenDialog(stat.dialogKey)} />
              </div>
            ))
          )}
        </div>
      )}

      {/* Shortcut Cards */}
      <ShortcutCards />

      {/* OKR Summary — surface único de erro do fullStats (OKR/NPS/perf/ações/
          headcount/gamificação/turnover vêm todos desta query; um retry recarrega tudo). */}
      {isLoadingFull ? (
        <Skeleton className="h-28 w-full rounded-2xl" />
      ) : isErrorFull ? (
        <QueryError
          message="Não foi possível carregar os indicadores do painel."
          onRetry={() => refetchFull()}
        />
      ) : fullStats && (
        <OKRStatusSummary data={fullStats.okr} />
      )}

      {/* NPS + Performance Row */}
      {isLoadingFull ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      ) : fullStats && (
        <NPSPerformanceRow nps={fullStats.nps} performance={fullStats.performance} />
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left Column */}
        <div className="space-y-6">
          <EngagementChart />

          {/* Weekly Actions */}
          {isLoadingFull ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : fullStats && (
            <WeeklyActionsCard data={fullStats.actions} />
          )}

          {/* Headcount Sparkline */}
          {isLoadingFull ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : fullStats && (
            <HeadcountSparkline data={fullStats.headcount} />
          )}

          <RecentActivity />
        </div>

        {/* Right Insights Panel */}
        <aside className="hidden lg:block">
          <div className="floating-panel sticky top-20 p-0 overflow-hidden">
            {/* Panel Header */}
            <div className="px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Insights
              </h2>
            </div>

            <Separator className="bg-border/40" />

            {/* Quick Stats Section */}
            <div className="px-5 py-4">
              <h3 className="text-sm font-semibold mb-3">Hoje</h3>
              <div className="space-y-3">
                {isLoadingStats ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-5 w-8" />
                    </div>
                  ))
                ) : isErrorStats ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Não foi possível carregar.
                  </p>
                ) : (
                  quickStatsData.map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                          {stat.icon}
                        </div>
                        <span className="text-sm text-muted-foreground">{stat.label}</span>
                      </div>
                      <span className="text-lg font-bold">{stat.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Separator className="bg-border/40" />

            {/* Gamification Mini */}
            {fullStats && (
              <>
                <div className="px-5 py-4">
                  <UserGamificationMini data={fullStats.gamification} />
                </div>
                <Separator className="bg-border/40" />
              </>
            )}

            {/* Turnover Mini */}
            {fullStats && (
              <>
                <div className="px-5 py-4">
                  <TurnoverMini data={fullStats.turnover} />
                </div>
                <Separator className="bg-border/40" />
              </>
            )}

            {/* Top Recognized */}
            <div className="px-5 py-4">
              <TopRecognizedWidget />
            </div>

            <Separator className="bg-border/40" />

            {/* Birthdays */}
            <div className="px-5 py-4">
              <BirthdaysWidget />
            </div>

            <Separator className="bg-border/40" />

            {/* Goals Progress Section */}
            <div className="px-5 py-4">
              <h3 className="text-sm font-semibold mb-3">Metas do Trimestre</h3>
              <div className="space-y-3">
                {isLoadingGoals ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                      <Skeleton className="h-1.5 w-full" />
                    </div>
                  ))
                ) : isErrorGoals ? (
                  <div className="py-2 text-xs text-muted-foreground">
                    <p>Não foi possível carregar as metas.</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 gap-1.5 px-2 text-xs"
                      onClick={() => refetchGoals()}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Tentar de novo
                    </Button>
                  </div>
                ) : quarterGoals && quarterGoals.length > 0 ? (
                  quarterGoals.map((goal) => (
                    <div key={goal.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground text-xs">{goal.label}</span>
                        <span className="font-medium text-xs">{goal.value}%</span>
                      </div>
                      <Progress value={goal.value} className="h-1.5" />
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-2">
                    Nenhum objetivo ativo
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Detail Dialogs */}
      <CollaboratorsDetailDialog open={openDialog === "collaborators"} onOpenChange={(v) => !v && setOpenDialog(null)} />
      <RecognitionsDetailDialog open={openDialog === "recognitions"} onOpenChange={(v) => !v && setOpenDialog(null)} />
      <ObjectivesDetailDialog open={openDialog === "objectives"} onOpenChange={(v) => !v && setOpenDialog(null)} />
      <EngagementDetailDialog open={openDialog === "engagement"} onOpenChange={(v) => !v && setOpenDialog(null)} />
    </div>
  );
}
