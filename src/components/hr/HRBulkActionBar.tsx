import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserCheck, UserX, Trash2, X } from "lucide-react";

interface Department {
  id: string;
  name: string;
}

interface HRBulkActionBarProps {
  selectedCount: number;
  departments: Department[];
  onSetDepartment: (deptId: string) => void;
  onSetRole: (role: "admin" | "manager" | "member") => void;
  onSetStatus: (status: "active" | "inactive") => void;
  onDelete: () => void;
  onClear: () => void;
}

/**
 * Barra de ações em massa da tabela de colaboradores (mover área, mudar função,
 * ativar/desativar, excluir). Aparece quando há seleção. Extraída de `HR.tsx`.
 */
export function HRBulkActionBar({
  selectedCount,
  departments,
  onSetDepartment,
  onSetRole,
  onSetStatus,
  onDelete,
  onClear,
}: HRBulkActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/60 px-4 py-2 mb-2">
      <span className="text-sm font-medium shrink-0">
        {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
      </span>
      <div className="flex flex-wrap items-center gap-2 ml-2">
        <Select onValueChange={onSetDepartment}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sem área</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => onSetRole(v as "admin" | "manager" | "member")}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Gestor</SelectItem>
            <SelectItem value="member">Membro</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
          onClick={() => onSetStatus("active")}>
          <UserCheck className="h-3.5 w-3.5" /> Ativar
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
          onClick={() => onSetStatus("inactive")}>
          <UserX className="h-3.5 w-3.5" /> Desativar
        </Button>
        <Button size="sm" variant="destructive" className="h-8 text-xs gap-1"
          onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </Button>
      </div>
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 ml-auto shrink-0"
        onClick={onClear}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
