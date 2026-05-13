import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, CheckCheck, MessageSquareX, SendHorizonal, X } from "lucide-react";
import {
  useRequestApproval,
  useCancelApprovalRequest,
  useApprovePDI,
  useRequestChanges,
  useRevokeApproval,
} from "@/hooks/usePDIApproval";
import type { PDIPlan } from "@/hooks/usePDI";

interface Props {
  plan: PDIPlan;
  currentUserId: string;
}

export function ApprovalActions({ plan, currentUserId }: Props) {
  const [changesDialogOpen, setChangesDialogOpen] = useState(false);
  const [changesComment, setChangesComment] = useState("");
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);

  const isOwner = plan.user_id === currentUserId;
  const isManager = plan.manager_id === currentUserId;

  const requestApproval = useRequestApproval(plan.id, currentUserId);
  const cancelRequest = useCancelApprovalRequest(plan.id, currentUserId);
  const approvePDI = useApprovePDI(plan.id);
  const requestChanges = useRequestChanges(plan.id);
  const revokeApproval = useRevokeApproval(plan.id, currentUserId);

  if (plan.status !== "active") return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isOwner && !plan.manager_id && null}

      {isOwner && plan.manager_id && !plan.approved_at && !plan.approval_requested_at && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => requestApproval.mutate()}
          disabled={requestApproval.isPending}
          className="gap-1.5"
        >
          {requestApproval.isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <SendHorizonal className="h-3.5 w-3.5" />
          }
          Solicitar aprovação
        </Button>
      )}

      {isOwner && plan.approval_requested_at && !plan.approved_at && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => cancelRequest.mutate()}
          disabled={cancelRequest.isPending}
          className="gap-1.5 text-muted-foreground"
        >
          {cancelRequest.isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <X className="h-3.5 w-3.5" />
          }
          Cancelar solicitação
        </Button>
      )}

      {isOwner && plan.approved_at && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setRevokeDialogOpen(true)}
          className="gap-1.5 text-muted-foreground text-xs"
        >
          Revogar aprovação
        </Button>
      )}

      {isManager && plan.approval_requested_at && !plan.approved_at && (
        <>
          <Button
            size="sm"
            onClick={() => approvePDI.mutate()}
            disabled={approvePDI.isPending}
            className="gap-1.5"
          >
            {approvePDI.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <CheckCheck className="h-3.5 w-3.5" />
            }
            Aprovar PDI
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setChangesDialogOpen(true)}
            className="gap-1.5"
          >
            <MessageSquareX className="h-3.5 w-3.5" />
            Solicitar ajustes
          </Button>
        </>
      )}

      <Dialog open={changesDialogOpen} onOpenChange={setChangesDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Solicitar ajustes</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Descreva os ajustes necessários... (obrigatório)"
            rows={4}
            value={changesComment}
            onChange={(e) => setChangesComment(e.target.value)}
            maxLength={1000}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangesDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={changesComment.trim().length < 1 || requestChanges.isPending}
              onClick={async () => {
                await requestChanges.mutateAsync(changesComment.trim());
                setChangesComment("");
                setChangesDialogOpen(false);
              }}
            >
              {requestChanges.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar aprovação?</AlertDialogTitle>
            <AlertDialogDescription>
              A aprovação do gestor será removida. Você precisará solicitar novamente após editar o PDI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { revokeApproval.mutate(); setRevokeDialogOpen(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
