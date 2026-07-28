import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import NumberFlow from "@number-flow/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  AlertTriangle,
  CalendarDays,
  Target,
  ArrowRight,
  CalendarPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/QueryError";
import { useTeamPanel } from "@/hooks/useTeamPanel";
import type { OneOnOneRow } from "@/hooks/useOneOnOnes";

const MEETING_STATUS: Record<
  OneOnOneRow["status"],
  { label: string; className: string }
> = {
  scheduled: { label: "Agendada", className: "border-transparent bg-primary/10 text-primary" },
  completed: {
    label: "Concluída",
    className: "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  canceled: { label: "Cancelada", className: "border-transparent bg-muted text-muted-foreground" },
  no_show: {
    label: "Não compareceu",
    className: "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

function initialsOf(name: string | null | undefined) {
  return (
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) || "?"
  );
}

function KpiTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none">
            <NumberFlow value={value} />
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function TeamPanel() {
  const {
    reports,
    reportsCount,
    meetingsThisWeek,
    totalOverdueCheckins,
    isLoading,
    isError,
    refetch,
  } = useTeamPanel();

  return (
    <section className="space-y-4" aria-label="Painel do Time">
      <div>
        <h2 className="text-base font-semibold">Painel do Time</h2>
        <p className="text-sm text-muted-foreground">
          Acompanhe seus liderados diretos e o que precisa de ação.
        </p>
      </div>

      {isError ? (
        <QueryError
          message="Não foi possível carregar o painel do time."
          onRetry={refetch}
        />
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* KPIs do time */}
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiTile icon={<Users />} label="Liderados diretos" value={reportsCount} />
            <KpiTile
              icon={<AlertTriangle />}
              label="Check-ins atrasados"
              value={totalOverdueCheckins}
            />
            <KpiTile
              icon={<CalendarDays />}
              label="1:1s esta semana"
              value={meetingsThisWeek.length}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Progresso de OKR por liderado */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-5 w-5 text-primary" />
                    Progresso por liderado
                  </CardTitle>
                  <Link
                    to="/okr-overview"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    OKRs do time <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Você ainda não tem liderados diretos"
                    description="Quando alguém for vinculado a você como gestor, o progresso aparece aqui."
                    className="py-10"
                  />
                ) : (
                  <ul className="space-y-4">
                    {reports.map(
                      ({ report, objectivesCount, avgProgress, overdueCheckins }) => (
                        <li key={report.id} className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={report.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-[11px] text-primary">
                                {initialsOf(report.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {report.full_name ?? "Sem nome"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {objectivesCount === 0
                                  ? "Sem objetivos"
                                  : `${objectivesCount} objetivo${objectivesCount > 1 ? "s" : ""}`}
                              </p>
                            </div>
                            {overdueCheckins > 0 ? (
                              <Badge
                                variant="outline"
                                className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              >
                                {overdueCheckins} atrasado{overdueCheckins > 1 ? "s" : ""}
                              </Badge>
                            ) : null}
                            <span className="w-9 text-right text-sm font-semibold tabular-nums">
                              {avgProgress}%
                            </span>
                          </div>
                          <Progress value={avgProgress} className="h-1.5" />
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* 1:1s da semana */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    1:1s da semana
                  </CardTitle>
                  <Link
                    to="/one-on-ones"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Ver 1:1s <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {meetingsThisWeek.length === 0 ? (
                  <EmptyState
                    icon={CalendarPlus}
                    title="Nenhuma 1:1 esta semana"
                    description="Agende conversas com seus liderados para manter o acompanhamento em dia."
                    className="py-10"
                  />
                ) : (
                  <ul className="space-y-3">
                    {meetingsThisWeek.map((m) => {
                      const status = MEETING_STATUS[m.status];
                      return (
                        <li key={m.id} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={m.member?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-[11px] text-primary">
                              {initialsOf(m.member?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {m.member?.full_name ?? "Sem nome"}
                            </p>
                            <p className="text-xs capitalize text-muted-foreground">
                              {format(parseISO(m.scheduled_at), "EEE, dd MMM · HH:mm", {
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                          <Badge variant="outline" className={status.className}>
                            {status.label}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
