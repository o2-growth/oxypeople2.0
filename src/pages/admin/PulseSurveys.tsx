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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Loader2, Activity, EyeOff, BarChart3, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  usePulseSurveysAdmin,
  type PulseSurveyAdminRow,
} from "@/hooks/usePulseSurveysAdmin";
import { useUserPermissions } from "@/hooks/useUserPermissions";
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
  const { isAdmin, isLoading: permsLoading } = useUserPermissions();
  const {
    pulseSurveys,
    isLoading,
    createPulse,
    updatePulse,
    togglePulse,
    deletePulse,
  } = usePulseSurveysAdmin();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PulseSurveyAdminRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PulseSurveyAdminRow | null>(null);

  useEffect(() => {
    if (!permsLoading && !isAdmin) {
      toast.error("Sem permissão para gerenciar pesquisas Pulse.");
      navigate("/", { replace: true });
    }
  }, [isAdmin, permsLoading, navigate]);

  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
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
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Pesquisas Pulse
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Pulses são perguntas curtas recorrentes (clima/eNPS/mood). Resultados em série temporal.
            </p>
            <p className="text-muted-foreground mt-1 text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Próximo dispatch: {nextDispatchUTC()}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nova pesquisa Pulse
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lista de pesquisas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : pulseSurveys.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Nenhuma pesquisa Pulse cadastrada. Clique em "Nova pesquisa Pulse" para começar.
              </div>
            ) : (
              <TooltipProvider delayDuration={200}>
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
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
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
              </TooltipProvider>
            )}
          </CardContent>
        </Card>
      </div>

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
