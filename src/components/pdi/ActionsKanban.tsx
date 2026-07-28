import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionCard } from "./ActionCard";
import { ActionForm } from "./ActionForm";
import { PDI_ACTION_STATUS } from "@/components/shared/StatusBadge";
import { usePDIActions, type PDIAction, type ActionStatus } from "@/hooks/usePDIActions";
import type { PDICompetency } from "@/hooks/usePDICompetencies";

interface Props {
  planId: string;
  competencies: PDICompetency[];
  onPlanRefetch: () => void;
  planUserId?: string;
  currentUserId?: string;
}

// Ordem das colunas (fluxo do kanban). Labels vêm de `PDI_ACTION_STATUS`.
const COLUMN_STATUSES: ActionStatus[] = ["todo", "doing", "done", "blocked"];

function KanbanColumn({
  column,
  actions,
  competencies,
  onAddAction,
  onEditAction,
  onDeleteAction,
  planUserId,
  currentUserId,
}: {
  column: { id: ActionStatus; label: string };
  actions: PDIAction[];
  competencies: PDICompetency[];
  onAddAction: (status: ActionStatus) => void;
  onEditAction: (action: PDIAction) => void;
  onDeleteAction: (id: string) => void;
  planUserId?: string;
  currentUserId?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {column.label}{" "}
          <span className="text-muted-foreground/60">({actions.length})</span>
        </h3>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => onAddAction(column.id)}
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[120px] rounded-lg border-2 border-dashed p-2 space-y-2 transition-colors",
          isOver ? "border-primary/50 bg-primary/5" : "border-muted",
        )}
      >
        {actions.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            competencies={competencies}
            onEdit={onEditAction}
            onDelete={onDeleteAction}
            planUserId={planUserId}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}

export function ActionsKanban({ planId, competencies, onPlanRefetch, planUserId, currentUserId }: Props) {
  const { list, add, edit, changeStatus, remove } = usePDIActions(planId);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PDIAction | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<ActionStatus>("todo");
  const [filterCompetency, setFilterCompetency] = useState<string>("");
  const [filterFeedback, setFilterFeedback] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));
  const actions = list.data ?? [];

  const filteredActions = actions
    .filter((a) => !filterCompetency || a.competency_id === filterCompetency)
    .filter((a) => !filterFeedback || a.feedback_request_id !== null);

  const actionsByStatus = (status: ActionStatus) =>
    filteredActions.filter((a) => a.status === status);

  const activeAction = activeId ? actions.find((a) => a.id === activeId) : null;

  const openAdd = (status: ActionStatus) => {
    setEditTarget(null);
    setDefaultStatus(status);
    setFormOpen(true);
  };

  const openEdit = (action: PDIAction) => {
    setEditTarget(action);
    setFormOpen(true);
  };

  const handleSubmit = async (input: Parameters<typeof add.mutateAsync>[0]) => {
    if (editTarget) {
      await edit.mutateAsync({ id: editTarget.id, ...input });
    } else {
      await add.mutateAsync(input);
    }
    onPlanRefetch();
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const fromStatus = (active.data.current as { status: ActionStatus })?.status;
    const toStatus = over.id as ActionStatus;
    if (fromStatus === toStatus) return;
    changeStatus.mutate(
      { id: String(active.id), from: fromStatus, to: toStatus },
      { onSuccess: onPlanRefetch },
    );
  };

  if (list.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isEmpty = actions.length === 0;

  return (
    <div className="space-y-4">
      {(competencies.length > 0 || actions.some((a) => a.feedback_request_id !== null)) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground shrink-0">Filtrar por:</span>
          {competencies.length > 0 && (
            <Select value={filterCompetency} onValueChange={setFilterCompetency}>
              <SelectTrigger className="w-[200px] h-8 text-sm">
                <SelectValue placeholder="Todas as competências" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as competências</SelectItem>
                {competencies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            variant={filterFeedback ? "default" : "outline"}
            className="h-8 text-xs gap-1.5"
            onClick={() => setFilterFeedback(!filterFeedback)}
            type="button"
          >
            <MessageSquare className="h-3 w-3" />
            De feedback
          </Button>
        </div>
      )}

      {isEmpty ? (
        <div className="py-10 text-center text-muted-foreground">
          <p className="text-sm">
            Nenhuma ação ainda. Comece adicionando o que vai te ajudar a desenvolver suas competências.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={() => openAdd("todo")}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar primeira ação
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMN_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                column={{ id: status, label: PDI_ACTION_STATUS[status].label }}
                actions={actionsByStatus(status)}
                competencies={competencies}
                onAddAction={openAdd}
                onEditAction={openEdit}
                onDeleteAction={(id) => {
                  remove.mutate(id, { onSuccess: onPlanRefetch });
                }}
                planUserId={planUserId}
                currentUserId={currentUserId}
              />
            ))}
          </div>

          <DragOverlay>
            {activeAction ? (
              <div className="rotate-2 opacity-90">
                <ActionCard
                  action={activeAction}
                  competencies={competencies}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  planUserId={planUserId}
                  currentUserId={currentUserId}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <ActionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
        defaultStatus={defaultStatus}
        competencies={competencies}
        onSubmit={handleSubmit}
        isSubmitting={add.isPending || edit.isPending}
      />
    </div>
  );
}
