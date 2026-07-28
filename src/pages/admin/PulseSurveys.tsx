import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Activity, EyeOff, BarChart3, AlertTriangle, Clock } from "lucide-react";
import {
  usePulseSurveysAdmin,
  type PulseSurveyAdminRow,
} from "@/hooks/usePulseSurveysAdmin";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { PageHeader } from "@/components/layout/PageHeader";
import { ListPageSkeleton } from "@/components/ui/page-skeleton";
import { QueryError } from "@/components/QueryError";
import { EmptyState } from "@/components/ui/empty-state";
import { PulseSurveyForm } from "@/components/admin/pulse/PulseSurveyForm";
import type { PulseSurveyFormValues } from "@/lib/validation/pulseSurveySchema";

const FREQUENCY_LABEL: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

const QUESTION_TYPE_LABEL: Record<string, string> = {
  scale_1_5: "Escala 1–5",
  enps_0_10: "eNPS 0–10",
  mood_emoji: "Mood (emoji)",
};

function formatLastDispatch(value: string | null): string {
  if (!value) return "Nunca";
  try {
    return format(parseISO(value), "dd MMM yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return value;
  }
}

function nextDispatchUTC(): string {
  const next = new Date();
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return `${String(next.getUTCHours()).padStart(2, "0")}:00 UTC`;
}

function isDispatchOverdue(row: PulseSurveyAdminRow): boolean {
  if (!row.active) return false;
  const limit = 25 * 60 * 60 * 1000;
  const now = Date.now();
  const ref = row.last_dispatched_at
    ? new Date(row.last_dispatched_at).getTime()
    : new Date(row.created_at).getTime();
  return now - ref > limit;
}

export default function PulseSurveysAdminPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: permsLoading } = useRequireAdmin({
    message: "Sem permissão para gerenciar pesquisas Pulse.",
  });
  const {
    pulseSurveys,
    isLoading,
    isError,
    refetch,
    createPulse,
    updatePulse,
    togglePulse,
    deletePulse,
  } = usePulseSurveysAdmin();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PulseSurveyAdminRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PulseSurveyAdminRow | null>(null);

  // Rótulo do próximo dispatch derivado de estado reativo: recomputa a cada
  // minuto para não congelar num horário defasado ao cruzar a virada de hora.
  const [nextDispatch, setNextDispatch] = useState(nextDispatchUTC);
  useEffect(() => {
    const id = setInterval(() => setNextDispatch(nextDispatchUTC()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <ListPageSkeleton />
      </AppLayout>
    );
  }

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (row: PulseSurveyAdminRow) => {
    setEditTarget(row);
    setFormOpen(true);
  };

  const handleSubmit = async (values: PulseSurveyFormValues) => {
    if (editTarget) {
      await updatePulse.mutateAsync({ ...values, id: editTarget.id });
    } else {
      await createPulse.mutateAsync(values);
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deletePulse.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <AppLayout>
      <PageHeader
        icon={Activity}
        title="Pesquisas Pulse"
        description="Pulses são perguntas curtas recorrentes (clima/eNPS/mood). Resultados em série temporal."
        actions={
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nova pesquisa Pulse
          </Button>
        }
      >
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Próximo dispatch: {nextDispatch}
        </p>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de pesquisas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <QueryError
              message="Não foi possível carregar as pesquisas Pulse."
              onRetry={() => refetch()}
            />
          ) : pulseSurveys.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Nenhuma pesquisa Pulse cadastrada"
              description="Crie uma pesquisa curta e recorrente para acompanhar clima, eNPS ou mood do time."
              action={{ label: "Nova pesquisa Pulse", onClick: openCreate }}
            />
          ) : (
            <TooltipProvider delayDuration={200}>
              {/* Mobile: cards (colapso da tabela de 9 colunas) */}
              <div className="space-y-3 md:hidden">
                {pulseSurveys.map((s) => (
                  <div key={s.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {s.question}
                        </p>
                      </div>
                      <Switch
                        checked={s.active}
                        onCheckedChange={(active) =>
                          togglePulse.mutate({ id: s.id, active })
                        }
                        disabled={togglePulse.isPending}
                        aria-label={s.active ? "Pausar pesquisa" : "Ativar pesquisa"}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">
                        {FREQUENCY_LABEL[s.frequency] ?? s.frequency}
                      </Badge>
                      <Badge variant="outline">
                        {QUESTION_TYPE_LABEL[s.question_type] ?? s.question_type}
                      </Badge>
                      {s.target_all ? (
                        <Badge variant="secondary">Toda empresa</Badge>
                      ) : (
                        <Badge variant="outline">
                          {s.target_departments.length} dept · {s.target_teams.length} time
                        </Badge>
                      )}
                      {s.anonymous && (
                        <Badge variant="outline" className="gap-1">
                          <EyeOff className="h-3 w-3" />
                          Anônimo
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate">
                          Último envio: {formatLastDispatch(s.last_dispatched_at)}
                        </span>
                        {isDispatchOverdue(s) && (
                          <AlertTriangle
                            className="h-3.5 w-3.5 shrink-0 text-warning"
                            aria-label="Dispatch atrasado — verifique o cron"
                          />
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        Respostas
                        <Badge
                          variant={s.response_count_current_period > 0 ? "secondary" : "outline"}
                        >
                          {s.response_count_current_period}
                        </Badge>
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1 border-t pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5"
                        onClick={() => navigate(`/admin/pulse-surveys/${s.id}/analytics`)}
                      >
                        <BarChart3 className="h-4 w-4" />
                        Resultados
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEdit(s)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(s)}
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: tabela completa */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Alvo</TableHead>
                      <TableHead>Anônimo</TableHead>
                      <TableHead>Último envio</TableHead>
                      <TableHead className="text-right">Respostas (período)</TableHead>
                      <TableHead className="w-32 text-center">Ativo</TableHead>
                      <TableHead className="w-32 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pulseSurveys.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium max-w-[200px]">
                          <div className="truncate">{s.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {s.question}
                          </div>
                        </TableCell>
                        <TableCell>{FREQUENCY_LABEL[s.frequency] ?? s.frequency}</TableCell>
                        <TableCell>{QUESTION_TYPE_LABEL[s.question_type] ?? s.question_type}</TableCell>
                        <TableCell>
                          {s.target_all ? (
                            <Badge variant="secondary">Toda empresa</Badge>
                          ) : (
                            <Badge variant="outline">
                              {s.target_departments.length} dept · {s.target_teams.length} time
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {s.anonymous ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>Respostas anônimas</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            {formatLastDispatch(s.last_dispatched_at)}
                            {isDispatchOverdue(s) && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                                </TooltipTrigger>
                                <TooltipContent>Dispatch atrasado — verifique o cron</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={s.response_count_current_period > 0 ? "secondary" : "outline"}>
                            {s.response_count_current_period}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={s.active}
                            onCheckedChange={(active) =>
                              togglePulse.mutate({ id: s.id, active })
                            }
                            disabled={togglePulse.isPending}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => navigate(`/admin/pulse-surveys/${s.id}/analytics`)}
                              title="Ver resultados"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEdit(s)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(s)}
                              title="Remover"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      <PulseSurveyForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValue={editTarget}
        onSubmit={handleSubmit}
        isSubmitting={createPulse.isPending || updatePulse.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover pesquisa Pulse?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" e todas as respostas vinculadas serão removidas permanentemente.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
