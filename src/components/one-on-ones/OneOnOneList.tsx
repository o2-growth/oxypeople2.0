import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Pencil, CheckCheck, X, Clock, MapPin, RefreshCw, ClipboardList, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { OneOnOneRow } from "@/hooks/useOneOnOnes";
import { DownloadIcsButton } from "./DownloadIcsButton";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  scheduled: { label: "Agendada", variant: "default" },
  completed: { label: "Concluída", variant: "secondary" },
  canceled: { label: "Cancelada", variant: "destructive" },
  no_show: { label: "Não compareceu", variant: "outline" },
};

const RECURRENCE_LABEL: Record<string, string> = {
  none: "",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

function initialsOf(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

interface Props {
  rows: OneOnOneRow[];
  currentUserId: string;
  onEdit: (row: OneOnOneRow) => void;
  onCancel: (id: string, reason?: string) => void;
  onComplete: (id: string) => void;
  isMutating: boolean;
}

export function OneOnOneList({ rows, currentUserId, onEdit, onCancel, onComplete, isMutating }: Props) {
  const [cancelTarget, setCancelTarget] = useState<OneOnOneRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [stopSeriesTarget, setStopSeriesTarget] = useState<OneOnOneRow | null>(null);
  const [isStoppingSeries, setIsStoppingSeries] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhuma 1:1 encontrada. Clique em "Agendar 1:1" para começar.
      </div>
    );
  }

  const handleCancelConfirm = () => {
    if (!cancelTarget) return;
    onCancel(cancelTarget.id, cancelReason.trim() || undefined);
    setCancelTarget(null);
    setCancelReason("");
  };

  const handleStopSeriesConfirm = async () => {
    if (!stopSeriesTarget) return;
    setIsStoppingSeries(true);
    try {
      const { error } = await supabase
        .from("one_on_ones")
        .update({ recurrence: "none" })
        .eq("id", stopSeriesTarget.id);
      if (error) throw error;
      toast.success("Série pausada. Esta 1:1 continuará normalmente.");
      queryClient.invalidateQueries({ queryKey: ["one-on-ones"] });
    } catch (err) {
      toast.error((err as Error).message ?? "Erro ao parar a série.");
    } finally {
      setIsStoppingSeries(false);
      setStopSeriesTarget(null);
    }
  };

  return (
    <>
      <div className="divide-y divide-border rounded-lg border">
        {rows.map((row) => {
          const counterpart =
            row.leader_id === currentUserId ? row.member : row.leader;
          const myRole = row.leader_id === currentUserId ? "Líder" : "Liderado";
          const isScheduled = row.status === "scheduled";
          const canComplete = isScheduled && isPast(parseISO(row.scheduled_at));
          const status = STATUS_BADGE[row.status] ?? { label: row.status, variant: "outline" as const };

          return (
            <div key={row.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
              <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                <AvatarImage src={counterpart?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {initialsOf(counterpart?.full_name ?? null)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {counterpart?.full_name ?? "Desconhecido"}
                  </span>
                  <Badge variant="outline" className="text-xs py-0">{myRole}</Badge>
                  <Badge variant={status.variant} className="text-xs py-0">{status.label}</Badge>
                  {row.recurrence !== "none" && (
                    <Badge variant="outline" className="text-xs py-0 gap-1">
                      <RefreshCw className="h-2.5 w-2.5" />
                      {RECURRENCE_LABEL[row.recurrence]}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(row.scheduled_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                    {" "}· {row.duration_minutes} min
                  </span>
                  {row.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {row.location}
                    </span>
                  )}
                </div>

                {row.canceled_reason && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Motivo: {row.canceled_reason}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => navigate(`/one-on-ones/${row.id}`)}
                  title="Ver pauta"
                >
                  <ClipboardList className="h-4 w-4" />
                </Button>
                <DownloadIcsButton
                  meeting={row}
                  leader={row.leader ?? { full_name: null }}
                  member={row.member ?? { full_name: null }}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                />
                {isScheduled && (
                  <>
                    {canComplete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600 hover:text-green-700"
                        onClick={() => onComplete(row.id)}
                        disabled={isMutating}
                        title="Marcar como concluída"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onEdit(row)}
                      disabled={isMutating}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setCancelTarget(row)}
                      disabled={isMutating}
                      title="Cancelar"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {row.recurrence !== "none" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-orange-600"
                        onClick={() => setStopSeriesTarget(row)}
                        disabled={isMutating}
                        title="Parar série"
                      >
                        <StopCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar 1:1?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Informe o motivo (opcional).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Motivo do cancelamento..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar 1:1
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!stopSeriesTarget} onOpenChange={(open) => !open && setStopSeriesTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Parar esta série?</AlertDialogTitle>
            <AlertDialogDescription>
              As próximas ocorrências não serão geradas automaticamente. Esta reunião continua normalmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStopSeriesConfirm}
              disabled={isStoppingSeries}
            >
              Parar série
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
