import { useState } from "react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { CreateObjectiveDialog } from "@/components/objectives/CreateObjectiveDialog";
import { ObjectivesContextBar } from "@/components/objectives/ObjectivesContextBar";
import { BoardHeader } from "@/components/objectives/BoardHeader";
import { BoardColumnHeaders } from "@/components/objectives/BoardColumnHeaders";
import { GroupFooter } from "@/components/objectives/GroupFooter";
import { ObjectiveTreeNode } from "@/components/objectives/ObjectiveTreeNode";
import { ObjectiveDetailPanel } from "@/components/objectives/ObjectiveDetailPanel";
import { BreakdownObjectiveDialog } from "@/components/objectives/BreakdownObjectiveDialog";
import { ObjectivesMap } from "@/components/objectives/ObjectivesMap";
import { ActionsKanban } from "@/components/actions/ActionsKanban";
import { DeletedItemsDialog } from "@/components/objectives/DeletedItemsDialog";
import { AuditLogDialog } from "@/components/objectives/AuditLogDialog";
import { SavedFiltersMenu } from "@/components/objectives/SavedFiltersMenu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Target, Building2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useObjectivesFilters } from "@/hooks/useObjectivesFilters";
import { ObjectiveType, ObjectiveWithDetails } from "@/hooks/useObjectives";
import { useOkrTier } from "@/hooks/useOkrTier";

export type DisplayMode = "tree" | "map" | "actions";

// Group colors for Monday.com style
const GROUP_COLORS = [
  "#579bfc", "#00c875", "#fdab3d", "#a25ddc", "#e2445c",
  "#037f4c", "#9cd326", "#cab641", "#784bd1", "#ff158a",
];

export default function Objectives() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("tree");
  const [createDefaults, setCreateDefaults] = useState<{
    type: ObjectiveType;
    parentId?: string;
  }>({ type: "operational" });

  const [selectedObjective, setSelectedObjective] = useState<ObjectiveWithDetails | null>(null);
  const [breakdownObjective, setBreakdownObjective] = useState<ObjectiveWithDetails | null>(null);
  const [isDeletedOpen, setIsDeletedOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  const { canCreateObjective } = useOkrTier();

  const {
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
    filteredObjectives,
    filteredTree,
    tree,
    stats,
    departments,
    responsibleUsers,
    isLoading,
    viewMode,
    setViewMode,
  } = useObjectivesFilters();

  const handleCreateChild = (parentId: string, childType: ObjectiveType) => {
    setCreateDefaults({ type: childType, parentId });
    setIsCreateOpen(true);
  };

  const handleNewObjective = () => {
    setCreateDefaults({ type: "strategic" });
    setIsCreateOpen(true);
  };

  const renderTree = () => {
    if (isLoading) {
      return (
        <div className="space-y-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center h-10 px-3 gap-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1 max-w-[200px]" />
              <Skeleton className="h-5 w-[75px]" />
              <Skeleton className="h-5 w-[80px]" />
              <Skeleton className="h-2 w-[100px]" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
          ))}
        </div>
      );
    }

    if (filteredTree.length === 0) {
      return (
        <div className="p-12 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum objetivo encontrado</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            {hasActiveFilters
              ? "Nenhum objetivo corresponde aos filtros aplicados."
              : canCreateObjective
                ? "Comece criando um objetivo estratégico para definir a direção da empresa."
                : "Você ainda não tem acesso a nenhum objetivo. Peça a um manager para incluir você como contribuidor."}
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters}>Limpar Filtros</Button>
          ) : canCreateObjective ? (
            <Button onClick={handleNewObjective} className="bg-[#00c875] hover:bg-[#00b461] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Criar Objetivo Estratégico
            </Button>
          ) : null}
        </div>
      );
    }

    // Group by department if viewMode is "department"
    if (viewMode === "department") {
      const grouped: Record<string, ObjectiveWithDetails[]> = {};
      filteredTree.forEach((obj) => {
        const dept = obj.department || (obj.team as any)?.department || "Sem departamento";
        if (!grouped[dept]) grouped[dept] = [];
        grouped[dept].push(obj);
      });

      return (
        <div className="space-y-0">
          {Object.entries(grouped).map(([dept, objectives], idx) => {
            const groupColor = GROUP_COLORS[idx % GROUP_COLORS.length];
            return (
              <Collapsible key={dept} defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 hover:bg-accent/30 transition-colors"
                  style={{ borderLeft: `6px solid ${groupColor}` }}
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-bold" style={{ color: groupColor }}>{dept}</span>
                  <span className="text-xs text-muted-foreground">({objectives.length})</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <BoardColumnHeaders />
                  <div className="space-y-0">
                    {objectives.map((objective) => (
                      <ObjectiveTreeNode
                        key={objective.id}
                        objective={objective}
                        onCreateChild={handleCreateChild}
                        onSelectObjective={setSelectedObjective}
                      />
                    ))}
                  </div>
                  <GroupFooter objectives={objectives} onAddItem={canCreateObjective ? handleNewObjective : undefined} />
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      );
    }

    // Default: single group "Todos os Objetivos"
    return (
      <div>
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderLeft: `6px solid ${GROUP_COLORS[0]}` }}>
          <span className="text-sm font-bold" style={{ color: GROUP_COLORS[0] }}>
            Todos os Objetivos
          </span>
          <span className="text-xs text-muted-foreground">({filteredTree.length})</span>
        </div>
        <BoardColumnHeaders />
        <div className="space-y-0">
          {filteredTree.map((objective) => (
            <ObjectiveTreeNode
              key={objective.id}
              objective={objective}
              onCreateChild={handleCreateChild}
              onSelectObjective={setSelectedObjective}
            />
          ))}
        </div>
        <GroupFooter objectives={filteredTree} onAddItem={canCreateObjective ? handleNewObjective : undefined} />
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Board Header — Monday style */}
        <BoardHeader
          displayMode={displayMode}
          setDisplayMode={setDisplayMode}
          onNewObjective={handleNewObjective}
          onOpenAudit={() => setIsAuditOpen(true)}
          onOpenDeleted={() => setIsDeletedOpen(true)}
          filteredObjectives={filteredObjectives}
          search={filters.search}
          onSearchChange={(v) => setFilters((p) => ({ ...p, search: v }))}
          canCreate={canCreateObjective}
          quarterFilter={filters.quarterFilter}
          onQuarterChange={(q) => setFilters((p) => ({ ...p, quarterFilter: q }))}
        />

        {/* Compact filters bar */}
        <div className="space-y-2">
          <ObjectivesContextBar
            filters={filters}
            setFilters={setFilters}
            clearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            departments={departments}
            responsibleUsers={responsibleUsers}
            viewMode={viewMode}
            setViewMode={setViewMode}
            stats={stats}
          />
          <div className="flex items-center gap-2 px-1">
            <SavedFiltersMenu
              currentFilters={filters}
              onApplyFilter={setFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>
        </div>

        {/* Content — board table */}
        <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
          {displayMode === "tree" && renderTree()}
          {displayMode === "map" && (
            <ObjectivesMap
              tree={filteredTree}
              isLoading={isLoading}
              onSelectObjective={setSelectedObjective}
            />
          )}
          {displayMode === "actions" && <ActionsKanban />}
        </div>
      </div>

      {/* Create Dialog */}
      <CreateObjectiveDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultType={createDefaults.type}
        defaultParentId={createDefaults.parentId}
      />

      {/* Detail Panel */}
      {selectedObjective && (
        <ObjectiveDetailPanel
          open={!!selectedObjective}
          onOpenChange={(open) => !open && setSelectedObjective(null)}
          objective={selectedObjective}
          allObjectives={filteredObjectives}
          onCreateChild={handleCreateChild}
          onBreakdown={setBreakdownObjective}
          onSelectObjective={setSelectedObjective}
        />
      )}

      {/* Breakdown Dialog */}
      {breakdownObjective && (
        <BreakdownObjectiveDialog
          open={!!breakdownObjective}
          onOpenChange={(open) => !open && setBreakdownObjective(null)}
          parentObjective={breakdownObjective}
        />
      )}

      {/* Deleted Items Dialog */}
      <DeletedItemsDialog open={isDeletedOpen} onOpenChange={setIsDeletedOpen} />

      {/* Audit Log Dialog */}
      <AuditLogDialog open={isAuditOpen} onOpenChange={setIsAuditOpen} />
    </AppLayout>
  );
}
