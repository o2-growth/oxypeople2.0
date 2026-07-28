import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { KeyResultItem, KeyResult } from "./KeyResultItem";

interface ObjectiveKeyResultsProps {
  keyResults: KeyResult[];
  filteredKRs: KeyResult[];
  krSearch: string;
  setKrSearch: (s: string) => void;
  canEdit?: boolean;
  canCheckin?: (kr: KeyResult) => boolean;
}

/**
 * Seção de resultados-chave: busca (quando há mais de 2 KRs) + lista de
 * `KeyResultItem` expansíveis.
 */
export function ObjectiveKeyResults({
  keyResults,
  filteredKRs,
  krSearch,
  setKrSearch,
  canEdit = false,
  canCheckin,
}: ObjectiveKeyResultsProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Resultados chave</h3>
        <div className="flex items-center gap-2">
          {keyResults.length > 2 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por resultado-chave ou responsável"
                value={krSearch}
                onChange={(e) => setKrSearch(e.target.value)}
                className="h-9 pl-8 text-sm w-64"
              />
            </div>
          )}
          {krSearch && (
            <Button variant="outline" size="sm" onClick={() => setKrSearch("")}>
              Limpar busca
            </Button>
          )}
        </div>
      </div>

      {/* KR list */}
      <div className="space-y-3">
        {filteredKRs.map((kr) => (
          <KeyResultItem
            key={kr.id}
            keyResult={kr}
            canEdit={canEdit}
            canCheckin={canCheckin ? canCheckin(kr) : false}
            expandable
          />
        ))}
      </div>

      {filteredKRs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {krSearch ? "Nenhum KR encontrado para a busca." : "Nenhum KR cadastrado."}
        </p>
      )}
    </div>
  );
}
