import { useState, type CSSProperties } from "react";
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
import { QueryError } from "@/components/QueryError";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Target, Building2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useObjectivesFilters } from "@/hooks/useObjectivesFilters";
import { ObjectiveType, ObjectiveWithDetails, useObjectives } from "@/hooks/useObjectives";
import { useOkrTier } from "@/hooks/useOkrTier";

export type DisplayMode = "tree" | "map" | "actions";

// Paleta do board (estilo Monday) — único ponto tipado com as 10 cores de grupo
// (escolhidas por índice, ciclam). São REDESIGN-SENSÍVEIS: distinguem grupos e
// preservam 1:1 os hex originais — não devem colapsar num único token. Locais a
// esta página (sem CSS vars em index.css, sem util em src/lib).
const GROUP_COLORS = [
  "#579bfc", "#00c875", "#fdab3d", "#a25ddc", "#e2445c",
  "#037f4c", "#9cd326", "#cab641", "#784bd1", "#ff158a",
] as const;

/** Cor do grupo `idx` (cicla a paleta). Único acesso às cores de grupo. */
const groupColor = (idx: number) => GROUP_COLORS[idx % GROUP_COLORS.length];

// Verde de marca da ação primária do board (base + hover). Exposto como CSS
// custom properties locais só para permitir o estado :hover sem hex cru na
// classe — os valores continuam centralizados aqui.
const boardCtaVars = {
  "--board-cta": "#00c875",
  "--board-cta-hover": "#00b461",
} as CSSProperties;

/**
 * Corpo de um grupo do board: cabeçalhos de coluna + linhas + rodapé.
 * Extraído para eliminar a duplicação entre a visão por área e a visão única.
 */
function BoardGroupBody({
  objectives,
  onCreateChild,
  onSelectObjective,
  onAddItem,
}: {
  objectives: ObjectiveWithDetails[];
  onCreateChild: (parentId: string, childType: ObjectiveType) => void;
  onSelectObjective: (objective: ObjectiveWithDetails) => void;
  onAddItem?: () => void;
}) {
  return (
    <>
      <BoardColumnHeaders />
      <div className="space-y-0">
        {objectives.map((objective) => (
          <ObjectiveTreeNode
            key={objective.id}
            objective={objective}
            onCreateChild={onCreateChild}
            onSelectObjective={onSelectObjective}
          />
        ))}
      </div>
      <GroupFooter objectives={objectives} onAddItem={onAddItem} />
    </>
  );
}

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
  // Mesma queryKey de useObjectivesFilters → React Query deduplica (sem refetch extra).
  // Expõe o estado de erro/refetch que o hook de filtros não repassa.
  const { isError, refetch } = useObjectives();

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
    teams,
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
    if (isError) {
      return (
        <QueryError
          message="Não foi possível carregar os objetivos."
          onRetry={() => refetch()}
        />
      );
    }

    if (isLoading) {
      return (
        <div className="space-y-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center h-10 px-3 gap-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1 max-w-xs" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-2 w-24" />
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
            <Button onClick={handleNewObjective} className="bg-[var(--board-cta)] hover:bg-[var(--board-cta-hover)] text-white">
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
        const dept = obj.department || obj.team?.department || "Sem área";
        if (!grouped[dept]) grouped[dept] = [];
        grouped[dept].push(obj);
      });

      return (
        <div className="space-y-0">
          {Object.entries(grouped).map(([dept, objectives], idx) => (
            <Collapsible key={dept} defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 hover:bg-accent/30 transition-colors"
                style={{ borderLeft: `6px solid ${groupColor(idx)}` }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-bold" style={{ color: groupColor(idx) }}>{dept}</span>
                <span className="text-xs text-muted-foreground">({objectives.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <BoardGroupBody
                  objectives={objectives}
                  onCreateChild={handleCreateChild}
                  onSelectObjective={setSelectedObjective}
                  onAddItem={canCreateObjective ? handleNewObjective : undefined}
                />
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      );
    }

    // Default: single group "Todos os Objetivos"
    return (
      <div>
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderLeft: `6px solid ${groupColor(0)}` }}>
          <span className="text-sm font-bold" style={{ color: groupColor(0) }}>
            Todos os Objetivos
          </span>
          <span className="text-xs text-muted-foreground">({filteredTree.length})</span>
        </div>
        <BoardGroupBody
          objectives={filteredTree}
          onCreateChild={handleCreateChild}
          onSelectObjective={setSelectedObjective}
          onAddItem={canCreateObjective ? handleNewObjective : undefined}
        />
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
            teams={teams}
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
        <div className="bg-card rounded-lg border border-border/50 overflow-hidden" style={boardCtaVars}>
          {displayMode === "tree" && renderTree()}
          {displayMode === "map" && (
            isError ? (
              <QueryError
                message="Não foi possível carregar os objetivos."
                onRetry={() => refetch()}
              />
            ) : (
              <ObjectivesMap
                tree={filteredTree}
                isLoading={isLoading}
                onSelectObjective={setSelectedObjective}
              />
            )
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
