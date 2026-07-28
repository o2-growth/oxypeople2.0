import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  CheckCircle2,
  Circle,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Clock,
  Plus,
  BarChart3,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { CheckinDialog } from "./CheckinDialog";
import { EditKeyResultDialog } from "./EditKeyResultDialog";
import { KrConfidenceSlider } from "./KrConfidenceSlider";
import { CheckinStreak } from "./CheckinStreak";
import { ProgressBarStatus } from "./ProgressBarStatus";
import { OverdueBadge } from "./OverdueBadge";
import { ProgressChart } from "./ProgressChart";
import { useCheckins } from "@/hooks/useCheckins";
import { useActions, useCreateAction, getWeekBucket, formatWeekLabel } from "@/hooks/useActions";
import { useDeleteKeyResult } from "@/hooks/useObjectives";
import { useAuth } from "@/contexts/AuthContext";
import { krProgress } from "@/lib/kr-progress";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface KeyResult {
  id: string;
  title: string;
  current_value: number;
  target_value: number;
  initial_value?: number;
  unit: string | null;
  objective_id?: string;
  weight_percentage?: number;
  last_checkin_at?: string | null;
  kr_type?: string;
  direction?: string;
  owner_user_id?: string | null;
  confidence?: number | null;
  owner?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
  periodStart?: string;
  periodEnd?: string;
}

interface KeyResultItemProps {
  keyResult: KeyResult;
  canEdit?: boolean;
  canCheckin?: boolean;
  expandable?: boolean;
}

const riskConfig: Record<string, { color: string }> = {
  green: { color: "bg-emerald-500" },
  yellow: { color: "bg-yellow-500" },
  red: { color: "bg-red-500" },
};

export function KeyResultItem({ keyResult, canEdit = false, canCheckin = false, expandable = true }: KeyResultItemProps) {
  const [showCheckin, setShowCheckin] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const deleteKR = useDeleteKeyResult();

  // Progresso via lib canônica de KR — respeita tipo (binary) e direção (down),
  // que a fórmula inline anterior ignorava (down ficava travado em 0%).
  const progress = krProgress({
    target_value: keyResult.target_value,
    current_value: keyResult.current_value,
    initial_value: keyResult.initial_value,
    kr_type: keyResult.kr_type,
    direction: keyResult.direction,
  });
  const isComplete = progress >= 100;

  const isOverdue = (() => {
    if (!keyResult.last_checkin_at) return true;
    const diff = (Date.now() - new Date(keyResult.last_checkin_at).getTime()) / (1000 * 60 * 60 * 24);
    return diff > 7;
  })();

  return (
    <>
      <div className="rounded-lg border bg-card/50 overflow-hidden">
        {/* KR Row */}
        <div className="flex items-center gap-3 p-3">
          {expandable && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          )}

          <div className="shrink-0">
            {isComplete ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">{keyResult.title}</span>
              {keyResult.weight_percentage != null && keyResult.weight_percentage > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                  {keyResult.weight_percentage}%
                </Badge>
              )}
              <OverdueBadge overdue={isOverdue && !isComplete} label="Atrasado" />
            </div>
          </div>

          <div className="w-28 shrink-0">
            <ProgressBarStatus value={progress} showValue={false} size="sm" />
          </div>

          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {keyResult.current_value} / {keyResult.target_value} {keyResult.unit || ""}
          </span>

          <span className={cn(
            "text-xs font-semibold shrink-0",
            progress >= 75 ? "text-emerald-500" : progress >= 50 ? "text-yellow-500" : progress >= 25 ? "text-orange-500" : "text-red-500"
          )}>
            {Math.round(progress)}%
          </span>

          {keyResult.owner && (
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarImage src={keyResult.owner.avatar_url || ""} />
              <AvatarFallback className="text-[8px]">
                {(keyResult.owner.full_name || keyResult.owner.email).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}

          <KrConfidenceSlider
            keyResultId={keyResult.id}
            value={keyResult.confidence ?? null}
            canEdit={canEdit}
            compact
            className="shrink-0"
          />

          {canCheckin && keyResult.objective_id && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs gap-1 shrink-0"
              onClick={() => setShowCheckin(true)}
            >
              <TrendingUp className="h-3 w-3" />
              Check-in
            </Button>
          )}

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setShowEdit(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar KR
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowDeleteAlert(true)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir KR
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {expanded && expandable && (
          <KeyResultDetailPanel krId={keyResult.id} kr={keyResult} />
        )}
      </div>

      {showCheckin && keyResult.objective_id && (
        <CheckinDialog
          open={showCheckin}
          onOpenChange={setShowCheckin}
          keyResult={{
            id: keyResult.id,
            title: keyResult.title,
            current_value: keyResult.current_value,
            target_value: keyResult.target_value,
            initial_value: keyResult.initial_value,
            unit: keyResult.unit,
            objective_id: keyResult.objective_id,
            kr_type: keyResult.kr_type,
            direction: keyResult.direction,
          }}
        />
      )}

      <EditKeyResultDialog keyResult={keyResult} open={showEdit} onOpenChange={setShowEdit} />

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Key Result?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O histórico de check-ins também será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteKR.mutate(keyResult.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function KeyResultDetailPanel({ krId, kr }: { krId: string; kr: KeyResult }) {
  const { data: checkins = [], isLoading } = useCheckins(krId);
  const { data: allActions = [] } = useActions();
  const { user } = useAuth();
  const [showCreateAction, setShowCreateAction] = useState(false);

  const supportsChart = kr.kr_type !== "binary";
  const krActions = allActions.filter((a) => a.key_result_id === krId);
  const currentWeek = getWeekBucket(new Date());

  const statusColors: Record<string, string> = {
    todo: "bg-muted text-muted-foreground",
    doing: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    done: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    blocked: "bg-red-500/10 text-red-500 border-red-500/30",
  };
  const statusLabels: Record<string, string> = {
    todo: "A Fazer",
    doing: "Fazendo",
    done: "Feito",
    blocked: "Bloqueado",
  };

  return (
    <div className="px-3 pb-3 border-t">
      <Tabs defaultValue="checkins" className="w-full mt-2">
        <TabsList className="w-full grid grid-cols-3 h-7">
          <TabsTrigger value="checkins" className="text-xs">Check-ins</TabsTrigger>
          <TabsTrigger value="tracking" className="text-xs">Acompanhamento</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">Ações ({krActions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="checkins" className="mt-2">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : checkins.length === 0 ? (
            <div className="text-center py-4">
              <Clock className="h-6 w-6 mx-auto text-muted-foreground mb-1.5" />
              <p className="text-xs text-muted-foreground">
                Nenhum check-in registrado ainda.
              </p>
            </div>
          ) : (
            <>
              <CheckinStreak
                checkins={checkins}
                lastCheckinAt={kr.last_checkin_at}
                className="mb-2 px-0.5"
              />
              <ScrollArea className="max-h-48">
                <div className="space-y-1.5">
                  {checkins.map((checkin) => (
                  <div key={checkin.id} className="p-2 rounded-lg bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {checkin.user && (
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={checkin.user.avatar_url || ""} />
                            <AvatarFallback className="text-[7px]">
                              {(checkin.user.full_name || checkin.user.email).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-[11px] font-medium">
                          {checkin.previous_value} → {Number(checkin.new_value)}
                        </span>
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          riskConfig[checkin.perceived_risk]?.color || "bg-muted"
                        )} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(checkin.created_at), "dd MMM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{checkin.comment}</p>
                    {checkin.has_blocker && (
                      <Badge variant="destructive" className="text-[9px]">
                        🚫 {checkin.blocker_description || "Bloqueio"}
                      </Badge>
                    )}
                  </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </TabsContent>

        <TabsContent value="tracking" className="mt-2">
          {supportsChart ? (
            <ProgressChart
              checkins={checkins}
              targetValue={kr.target_value}
              initialValue={kr.initial_value || 0}
              unit={kr.unit}
              krType={kr.kr_type}
              direction={kr.direction}
              periodStart={kr.periodStart}
              periodEnd={kr.periodEnd}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">
                  Tipo de meta não possui acompanhamento em gráfico.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="actions" className="mt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium">Ações vinculadas</h4>
              <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => setShowCreateAction(true)}>
                <Plus className="h-3 w-3" />
                Nova Ação
              </Button>
            </div>

            {krActions.length === 0 ? (
              <div className="text-center py-3">
                <ListTodo className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-[10px] text-muted-foreground">Nenhuma ação vinculada a este KR.</p>
              </div>
            ) : (
              krActions.map((action) => (
                <div key={action.id} className="p-2 rounded-lg border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium truncate flex-1">{action.title}</span>
                    <Badge variant="outline" className={cn("text-[9px] ml-2", statusColors[action.status])}>
                      {statusLabels[action.status] || action.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                    {action.owner && (
                      <span>{action.owner.full_name || action.owner.email}</span>
                    )}
                    <span>{formatWeekLabel(action.week_bucket)}</span>
                  </div>
                </div>
              ))
            )}

            {showCreateAction && kr.objective_id && (
              <KRCreateActionInline
                objectiveId={kr.objective_id}
                keyResultId={krId}
                weekBucket={currentWeek}
                onClose={() => setShowCreateAction(false)}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KRCreateActionInline({
  objectiveId,
  keyResultId,
  weekBucket,
  onClose,
}: {
  objectiveId: string;
  keyResultId: string;
  weekBucket: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const createAction = useCreateAction();
  const { user } = useAuth();

  const handleCreate = async () => {
    if (!title.trim() || !user?.id) return;
    try {
      await createAction.mutateAsync({
        title: title.trim(),
        objective_id: objectiveId,
        key_result_id: keyResultId,
        owner_user_id: user.id,
        week_bucket: weekBucket,
        status: "todo",
      });
      onClose();
    } catch {
      // handled
    }
  };

  return (
    <div className="p-2 rounded-lg border border-primary/30 bg-primary/5 space-y-1.5">
      <input
        className="w-full text-[11px] bg-transparent border-b border-border focus:border-primary outline-none pb-1"
        placeholder="Título da ação..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        autoFocus
      />
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-5 text-[10px] px-2" onClick={handleCreate} disabled={!title.trim() || createAction.isPending}>
          Criar
        </Button>
        <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
