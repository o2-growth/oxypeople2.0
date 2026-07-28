import { Card, CardContent } from "@/components/ui/card";
import type { ObjectiveWithDetails } from "@/hooks/useObjectives";
import { KeyResult } from "./KeyResultItem";
import { ObjectiveChildren } from "./ObjectiveChildren";
import { ObjectiveKeyResults } from "./ObjectiveKeyResults";
import { ObjectiveEmptyState } from "./ObjectiveEmptyState";
import { CommentsTab } from "./CommentsTab";
import { AuditHistory } from "./AuditHistory";
import { CollaboratorsTab } from "./CollaboratorsTab";

interface ObjectiveContentProps {
  objective: ObjectiveWithDetails;
  childObjectives: ObjectiveWithDetails[];
  keyResults: KeyResult[];
  filteredKRs: KeyResult[];
  krSearch: string;
  setKrSearch: (s: string) => void;
  activeTab: string;
  canEditKR: boolean;
  canCheckin: (kr: KeyResult) => boolean;
  canManageCollaborators: boolean;
  onCreateKR: () => void;
  onCreateChild: () => void;
  onNavigate: (id: string) => void;
}

/**
 * Área de conteúdo do detalhe do objetivo, alternada pela barra de ações do
 * cabeçalho: lista (KRs / filhos / vazio), histórico (auditoria), discussão
 * (comentários) e colaboradores.
 */
export function ObjectiveContent({
  objective,
  childObjectives,
  keyResults,
  filteredKRs,
  krSearch,
  setKrSearch,
  activeTab,
  canEditKR,
  canCheckin,
  canManageCollaborators,
  onCreateKR,
  onCreateChild,
  onNavigate,
}: ObjectiveContentProps) {
  const hasKRs = objective.key_results.length > 0;
  const hasChildren = childObjectives.length > 0;

  return (
    <Card>
      <CardContent className="p-6">
        {activeTab === "list" && (
          <>
            {/* Para estratégico/tático: mostrar objetivos filhos */}
            {(objective.type === "strategic" || objective.type === "tactical") && hasChildren && !hasKRs ? (
              <ObjectiveChildren
                objective={objective}
                childObjectives={childObjectives}
                onNavigate={onNavigate}
              />
            ) : hasKRs ? (
              <ObjectiveKeyResults
                keyResults={keyResults}
                filteredKRs={filteredKRs}
                krSearch={krSearch}
                setKrSearch={setKrSearch}
                canEdit={canEditKR}
                canCheckin={canCheckin}
              />
            ) : hasChildren ? (
              <ObjectiveChildren
                objective={objective}
                childObjectives={childObjectives}
                onNavigate={onNavigate}
              />
            ) : (
              <ObjectiveEmptyState
                objective={objective}
                onCreateKR={onCreateKR}
                onCreateChild={onCreateChild}
              />
            )}
          </>
        )}

        {activeTab === "tree" && <AuditHistory entityId={objective.id} />}

        {activeTab === "comments" && <CommentsTab objectiveId={objective.id} />}

        {activeTab === "collaborators" && (
          <CollaboratorsTab objective={objective} canEdit={canManageCollaborators} />
        )}
      </CardContent>
    </Card>
  );
}
