import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, CalendarDays, ListTodo, User, Target } from "lucide-react";
import {
  useActions,
  useUpdateAction,
  generateWeekBuckets,
  getWeekBucket,
  formatWeekLabel,
  Action,
} from "@/hooks/useActions";
import { usePeriods } from "@/hooks/useObjectives";
import { useObjectives } from "@/hooks/useObjectives";
import { ActionCard } from "./ActionCard";
import { CreateActionDialog } from "./CreateActionDialog";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[200px] bg-muted/20 rounded-b-md border border-t-0 p-2 space-y-2 transition-colors ${isOver ? "bg-primary/5 border-primary/20" : ""}`}
    >
      {children}
    </div>
  );
}

export function ActionsKanban() {
  const { data: periods = [] } = usePeriods();
  const { data: objectives = [] } = useObjectives();
  const { data: companyUsers = [] } = useCompanyUsers();
  const updateAction = useUpdateAction();

  const currentWeek = getWeekBucket(new Date());
  const currentPeriod = periods.find((p) => {
    const now = new Date();
    return new Date(p.start_date) <= now && new Date(p.end_date) >= now;
  });

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(
    currentPeriod?.id || null
  );
  const [filterObjectiveId, setFilterObjectiveId] = useState<string>("all");
  const [filterOwnerId, setFilterOwnerId] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createWeek, setCreateWeek] = useState(currentWeek);
  const [activeAction, setActiveAction] = useState<Action | null>(null);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  const weeks = useMemo(() => {
    if (selectedPeriod) {
      return generateWeekBuckets(
        new Date(selectedPeriod.start_date),
        new Date(selectedPeriod.end_date)
      );
    }
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 28);
    const end = new Date(now);
    end.setDate(end.getDate() + 28);
    return generateWeekBuckets(start, end);
  }, [selectedPeriod]);

  const { data: actions = [], isLoading } = useActions(weeks);

  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      if (filterObjectiveId !== "all" && a.objective_id !== filterObjectiveId) return false;
      if (filterOwnerId !== "all" && a.owner_user_id !== filterOwnerId) return false;
      return true;
    });
  }, [actions, filterObjectiveId, filterOwnerId]);

  const actionsByWeek = useMemo(() => {
    const map: Record<string, Action[]> = {};
    weeks.forEach((w) => (map[w] = []));
    filteredActions.forEach((a) => {
      if (map[a.week_bucket]) {
        map[a.week_bucket].push(a);
      }
    });
    return map;
  }, [filteredActions, weeks]);

  const handleCreateInWeek = (week: string) => {
    setCreateWeek(week);
    setIsCreateOpen(true);
  };

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const action = filteredActions.find((a) => a.id === event.active.id);
    setActiveAction(action || null);
  }, [filteredActions]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveAction(null);
    const { active, over } = event;
    if (!over) return;

    const actionId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a week column
    const targetWeek = weeks.find((w) => w === overId);
    if (targetWeek) {
      const action = filteredActions.find((a) => a.id === actionId);
      if (action && action.week_bucket !== targetWeek) {
        await updateAction.mutateAsync({ id: actionId, week_bucket: targetWeek });
      }
      return;
    }

    // Dropped on another action — move to same week as that action
    const targetAction = filteredActions.find((a) => a.id === overId);
    if (targetAction) {
      const action = filteredActions.find((a) => a.id === actionId);
      if (action && action.week_bucket !== targetAction.week_bucket) {
        await updateAction.mutateAsync({ id: actionId, week_bucket: targetAction.week_bucket });
      }
    }
  }, [filteredActions, weeks, updateAction]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Ações
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedPeriodId || "default"}
              onValueChange={(v) => setSelectedPeriodId(v === "default" ? null : v)}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <CalendarDays className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">8 semanas</SelectItem>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterObjectiveId} onValueChange={setFilterObjectiveId}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <Target className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Objetivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos objetivos</SelectItem>
                {objectives.map((obj) => (
                  <SelectItem key={obj.id} value={obj.id}>
                    {obj.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterOwnerId} onValueChange={setFilterOwnerId}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <User className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {companyUsers.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-1.5 h-8" onClick={() => handleCreateInWeek(currentWeek)}>
              <Plus className="h-3.5 w-3.5" />
              Nova Ação
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-56 shrink-0 space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4 min-w-max">
                {weeks.map((week) => {
                  const weekActions = actionsByWeek[week] || [];
                  const isCurrent = week === currentWeek;
                  const actionIds = weekActions.map((a) => a.id);

                  return (
                    <div key={week} className="w-56 shrink-0 flex flex-col">
                      <div className={`flex items-center justify-between px-2 py-1.5 rounded-t-md border-b ${isCurrent ? "bg-primary/10 border-primary/30" : "bg-muted/50"}`}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">
                            {formatWeekLabel(week)}
                          </span>
                          {isCurrent && (
                            <Badge variant="default" className="text-[9px] h-4 px-1">
                              Atual
                            </Badge>
                          )}
                        </div>
                        {weekActions.length > 0 && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1">
                            {weekActions.length}
                          </Badge>
                        )}
                      </div>

                      <SortableContext items={actionIds} strategy={verticalListSortingStrategy}>
                        <DroppableColumn id={week}>
                          {weekActions.map((action) => (
                            <ActionCard key={action.id} action={action} />
                          ))}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                            onClick={() => handleCreateInWeek(week)}
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar
                          </Button>
                        </DroppableColumn>
                      </SortableContext>
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <DragOverlay>
              {activeAction && (
                <div className="w-52 rounded-lg border bg-card p-3 shadow-lg opacity-90">
                  <h4 className="text-xs font-medium">{activeAction.title}</h4>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </CardContent>

      <CreateActionDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultWeek={createWeek}
        weeks={weeks}
        defaultObjectiveId={filterObjectiveId !== "all" ? filterObjectiveId : undefined}
      />
    </Card>
  );
}
