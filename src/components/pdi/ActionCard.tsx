import { useDraggable } from "@dnd-kit/core";
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
import { AlertTriangle, Pencil, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { isAfter, isBefore, addDays, parseISO, startOfToday } from "date-fns";
import type { PDIAction } from "@/hooks/usePDIActions";
import type { PDICompetency } from "@/hooks/usePDICompetencies";
import { EvidenceUpload } from "./EvidenceUpload";

interface Props {
  action: PDIAction;
  competencies: PDICompetency[];
  onEdit: (action: PDIAction) => void;
  onDelete: (id: string) => void;
  planUserId?: string;
  currentUserId?: string;
}

export function ActionCard({ action, competencies, onEdit, onDelete, planUserId, currentUserId }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOwner = !!planUserId && !!currentUserId && planUserId === currentUserId;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: action.id,
    data: { status: action.status },
  });

  const today = startOfToday();
  const dueDate = action.due_date ? parseISO(action.due_date) : null;
  const isOverdue = dueDate && isBefore(dueDate, today) && action.status !== "done";
  const isDueSoon =
    dueDate &&
    !isOverdue &&
    isAfter(dueDate, today) &&
    isBefore(dueDate, addDays(today, 3)) &&
    action.status !== "done";

  const competency = action.competency_id
    ? competencies.find((c) => c.id === action.competency_id)
    : null;

  return (
    <>
      <div
        ref={setNodeRef}
        className={cn(
          "rounded-lg border bg-card p-3 space-y-2 group cursor-default",
          isDragging && "opacity-40 shadow-lg",
        )}
      >
        <div className="flex items-start gap-1.5">
          <button
            {...attributes}
            {...listeners}
            className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 mt-0.5"
            type="button"
            tabIndex={-1}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <span className="text-sm font-medium leading-snug">{action.title}</span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => onEdit(action)}
                  type="button"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                  type="button"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {action.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {action.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {action.status === "blocked" && (
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
          )}
          {isOverdue && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0">
              Atrasada
            </Badge>
          )}
          {isDueSoon && (
            <Badge className="text-xs px-1.5 py-0 bg-yellow-500 hover:bg-yellow-500 text-white">
              Vence em breve
            </Badge>
          )}
          {competency && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 max-w-[120px] truncate">
              {competency.name}
            </Badge>
          )}
        </div>

        <EvidenceUpload action={action} planId={action.pdi_plan_id} isOwner={isOwner} />
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover ação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete(action.id);
                setConfirmDelete(false);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
