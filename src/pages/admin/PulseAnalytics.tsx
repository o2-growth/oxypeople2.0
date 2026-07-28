import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Users,
  TrendingUp,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { usePulseAnalytics, type PulseAnalyticsFilters } from "@/hooks/usePulseAnalytics";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { PulseLineChart } from "@/components/admin/pulse/PulseLineChart";
import { PulseFilters } from "@/components/admin/pulse/PulseFilters";
import { PulseCommentsDrawer } from "@/components/admin/pulse/PulseCommentsDrawer";
import { ExportPulseButton } from "@/components/admin/pulse/ExportPulseButton";
import { trackEvent } from "@/lib/analytics";
import { enpsColor } from "@/lib/pulse/enpsCalc";
import { cn } from "@/lib/utils";

const FREQ_LABEL: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

const TYPE_LABEL: Record<string, string> = {
  scale_1_5: "Escala 1–5",
  enps_0_10: "eNPS 0–10",
  mood_emoji: "Mood (emoji)",
};

function formatPeriod(value: string) {
  try {
    return format(parseISO(value), "dd MMM yyyy", { locale: ptBR });
  } catch {
    return value;
  }
}

const ENPS_COLOR_CLASS: Record<string, string> = {
  destructive: "text-destructive",
  amber: "text-warning",
  emerald: "text-success",
};

export default function PulseAnalyticsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAdmin, isLoading: permsLoading } = useRequireAdmin({
    message: "Sem permissão.",
  });

  const [filters, setFilters] = useState<PulseAnalyticsFilters>({
    departmentIds: [],
    teamIds: [],
    periodsBack: 12,
  });
  const [drawerPeriod, setDrawerPeriod] = useState<string | null>(null);

  const analytics = usePulseAnalytics(id, filters);


  useEffect(() => {
    if (id) trackEvent("pulse_analytics_viewed", { pulse_survey_id: id });
  }, [id]);

  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const { pulse, periods, comments, totalEligible, currentResponseRate, blockedAnonymity, currentEnps } = analytics;

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/pulse-surveys")} className="-ml-2 gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Voltar para lista
        </Button>

        {analytics.loading ? (
          <Card>
            <CardContent className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : !pulse ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Pulse não encontrado ou foi removido.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Activity className="h-6 w-6 text-success" />
                    {pulse.name}
                  </h1>
                  {pulse.anonymous && (
                    <Badge variant="secondary" className="gap-1">
                      <EyeOff className="h-3 w-3" />
                      Anônimo
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {pulse.question} · {FREQ_LABEL[pulse.frequency]} · {TYPE_LABEL[pulse.question_type]}
                </p>
              </div>
              <ExportPulseButton
                pulseId={pulse.id}
                pulseName={pulse.name}
                anonymous={pulse.anonymous}
                filters={{ departmentIds: filters.departmentIds, teamIds: filters.teamIds }}
                blockedAnonymity={blockedAnonymity}
              />
            </header>

            <div className="grid gap-4 md:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        Período atual
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">
                        {periods[periods.length - 1]?.count ?? 0}
                        <span className="text-sm text-muted-foreground font-normal"> / {totalEligible}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{currentResponseRate}% de resposta</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {pulse.question_type === "enps_0_10" ? "eNPS atual" : "Média atual"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {pulse.question_type === "enps_0_10" && currentEnps ? (
                        <p
                          className={cn(
                            "text-2xl font-semibold",
                            ENPS_COLOR_CLASS[enpsColor(currentEnps.enps)],
                          )}
                        >
                          {currentEnps.enps > 0 ? "+" : ""}
                          {currentEnps.enps}
                        </p>
                      ) : (
                        <p className="text-2xl font-semibold">
                          {periods[periods.length - 1]?.avg ?? 0}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {periods.length} períodos analisados
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-xs text-muted-foreground font-normal">
                        Total respostas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">
                        {periods.reduce((acc, p) => acc + p.count, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Comentários: {comments.length}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {blockedAnonymity ? (
                  <Card className="border-warning/40 bg-warning/5">
                    <CardContent className="flex items-start gap-3 py-4">
                      <ShieldAlert className="h-5 w-5 text-warning mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Amostra muito pequena</p>
                        <p className="text-xs text-muted-foreground">
                          Para preservar o anonimato, gráficos só aparecem com 5 ou mais respondentes
                          únicos. Remova filtros para visualizar.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Evolução</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {periods.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          Nenhuma resposta ainda. Aguarde o primeiro envio.
                        </p>
                      ) : (
                        <PulseLineChart rows={periods} questionType={pulse.question_type} />
                      )}
                    </CardContent>
                  </Card>
                )}

                {periods.length > 0 && !blockedAnonymity && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Histórico</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Período</TableHead>
                            <TableHead className="text-right">Respostas</TableHead>
                            <TableHead className="text-right">
                              {pulse.question_type === "enps_0_10" ? "eNPS" : "Média"}
                            </TableHead>
                            {pulse.question_type === "enps_0_10" && (
                              <>
                                <TableHead className="text-right hidden md:table-cell">% Prom.</TableHead>
                                <TableHead className="text-right hidden md:table-cell">% Pas.</TableHead>
                                <TableHead className="text-right hidden md:table-cell">% Det.</TableHead>
                              </>
                            )}
                            <TableHead className="text-right hidden md:table-cell">% c/ comentário</TableHead>
                            <TableHead className="text-right">Comentários</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...periods].reverse().map((p) => {
                            const periodComments = comments.filter((c) => c.period_start === p.period_start);
                            return (
                              <TableRow key={p.period_start}>
                                <TableCell>{formatPeriod(p.period_start)}</TableCell>
                                <TableCell className="text-right">{p.count}</TableCell>
                                <TableCell className="text-right font-mono">
                                  {p.enps ? (p.enps.enps > 0 ? `+${p.enps.enps}` : p.enps.enps) : p.avg}
                                </TableCell>
                                {pulse.question_type === "enps_0_10" && (
                                  <>
                                    <TableCell className="text-right hidden md:table-cell">
                                      {p.enps?.promotersPct ?? 0}%
                                    </TableCell>
                                    <TableCell className="text-right hidden md:table-cell">
                                      {p.enps?.passivesPct ?? 0}%
                                    </TableCell>
                                    <TableCell className="text-right hidden md:table-cell">
                                      {p.enps?.detractorsPct ?? 0}%
                                    </TableCell>
                                  </>
                                )}
                                <TableCell className="text-right hidden md:table-cell">{p.withCommentPct}%</TableCell>
                                <TableCell className="text-right">
                                  {periodComments.length > 0 ? (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-xs"
                                      onClick={() => setDrawerPeriod(p.period_start)}
                                    >
                                      Ver {periodComments.length}
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>

              <aside>
                <PulseFilters value={filters} onChange={setFilters} />
              </aside>
            </div>
          </>
        )}
      </div>

      <PulseCommentsDrawer
        open={!!drawerPeriod}
        onOpenChange={(open) => !open && setDrawerPeriod(null)}
        periodStart={drawerPeriod}
        comments={comments}
        anonymous={pulse?.anonymous ?? false}
      />
    </AppLayout>
  );
}
