import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Department {
  id: string;
  name: string;
  color: string | null;
}

interface CollaboratorsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  birthdayFilter: string;
  onBirthdayChange: (value: string) => void;
  departments: Department[];
  viewMode: "table" | "cards";
  onViewModeChange: (value: "table" | "cards") => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function CollaboratorsFilters({
  searchQuery,
  onSearchChange,
  departmentFilter,
  onDepartmentChange,
  statusFilter,
  onStatusChange,
  birthdayFilter,
  onBirthdayChange,
  departments,
  viewMode,
  onViewModeChange,
  onClearFilters,
  hasActiveFilters,
}: CollaboratorsFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {/* Department Filter */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Área
          </label>
          <Select value={departmentFilter} onValueChange={onDepartmentChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: dept.color || "#3B82F6" }}
                    />
                    {dept.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Status
          </label>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="invited">Convidados</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Birthday Filter */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Aniversariantes
          </label>
          <Select value={birthdayFilter} onValueChange={onBirthdayChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="this_month">Este mês</SelectItem>
              <SelectItem value="next_month">Próximo mês</SelectItem>
              <SelectItem value="this_week">Esta semana</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Pesquisar
          </label>
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

        {/* Actions */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Visualização
          </label>
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) =>
                value && onViewModeChange(value as "table" | "cards")
              }
              className="bg-muted rounded-md p-1"
            >
              <ToggleGroupItem
                value="table"
                aria-label="Visualizar em tabela"
                className="data-[state=on]:bg-background"
              >
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="cards"
                aria-label="Visualizar em cards"
                className="data-[state=on]:bg-background"
              >
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="gap-1"
              >
                <X className="h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
