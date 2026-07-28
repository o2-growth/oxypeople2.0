import { Button } from "@/components/ui/button";
import { Plus, GitBranchPlus, AlertTriangle } from "lucide-react";
import type { ObjectiveWithDetails } from "@/hooks/useObjectives";

interface ObjectiveEmptyStateProps {
  objective: ObjectiveWithDetails;
  onCreateKR: () => void;
  onCreateChild: () => void;
}

/**
 * Estado vazio do objetivo: nenhum resultado-chave nem objetivo filho.
 * Oferece CTAs para adicionar KR ou criar objetivo filho (quando aplicável).
 */
export function ObjectiveEmptyState({ objective, onCreateKR, onCreateChild }: ObjectiveEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <AlertTriangle className="h-10 w-10 mx-auto text-warning mb-3" />
      <h3 className="text-lg font-medium mb-1">Este objetivo ainda não possui metas nem objetivos filhos.</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Adicione Key Results para medir o progresso ou crie objetivos filhos.
      </p>
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onCreateKR} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar KR
        </Button>
        {objective.type !== "operational" && (
          <Button variant="outline" onClick={onCreateChild} className="gap-2">
            <GitBranchPlus className="h-4 w-4" />
            Criar Objetivo Filho
          </Button>
        )}
      </div>
    </div>
  );
}
