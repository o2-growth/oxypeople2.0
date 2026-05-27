import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

interface Department {
  id: string;
  name: string;
  color: string | null;
}

interface HRCollaboratorsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  employmentTypeFilter: string;
  onEmploymentTypeChange: (value: string) => void;
  departments: Department[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function HRCollaboratorsFilters({
  searchQuery,
  onSearchChange,
  departmentFilter,
  onDepartmentChange,
  statusFilter,
  onStatusChange,
  employmentTypeFilter,
  onEmploymentTypeChange,
  departments,
  onClearFilters,
  hasActiveFilters,
}: HRCollaboratorsFiltersProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">Área</label>
        <Select value={departmentFilter} onValueChange={onDepartmentChange}>
          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color || "#3B82F6" }} />
                  {dept.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">Status</label>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="invited">Convidados</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">Tipo Contratação</label>
        <Select value={employmentTypeFilter} onValueChange={onEmploymentTypeChange}>
          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="CLT">CLT</SelectItem>
            <SelectItem value="PJ">PJ</SelectItem>
            <SelectItem value="Estágio">Estágio</SelectItem>
            <SelectItem value="Temporário">Temporário</SelectItem>
            <SelectItem value="Terceirizado">Terceirizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">Pesquisar</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nome, email ou cargo..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">&nbsp;</label>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters} className="gap-1 w-full">
            <X className="h-3 w-3" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
