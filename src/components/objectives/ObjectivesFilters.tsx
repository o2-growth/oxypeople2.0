import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  X,
  Building2,
  User,
  Calendar,
} from "lucide-react";
import { ObjectivesFilterState } from "@/hooks/useObjectivesFilters";
import { usePeriods } from "@/hooks/useObjectives";

interface ObjectivesFiltersProps {
  filters: ObjectivesFilterState;
  setFilters: React.Dispatch<React.SetStateAction<ObjectivesFilterState>>;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  departments: string[];
  responsibleUsers: { id: string; name: string; email: string; avatar_url: string | null }[];
}

export function ObjectivesFilters({
  filters,
  setFilters,
  clearFilters,
  hasActiveFilters,
  departments,
  responsibleUsers,
}: ObjectivesFiltersProps) {
  const { data: periods = [] } = usePeriods();

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleDepartmentToggle = (dept: string) => {
    setFilters((prev) => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter((d) => d !== dept)
        : [...prev.departments, dept],
    }));
  };

  const handleResponsibleToggle = (userId: string) => {
    setFilters((prev) => ({
      ...prev,
      responsibleIds: prev.responsibleIds.includes(userId)
        ? prev.responsibleIds.filter((id) => id !== userId)
        : [...prev.responsibleIds, userId],
    }));
  };

  const handleTypeToggle = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      objectiveTypes: prev.objectiveTypes.includes(type as any)
        ? prev.objectiveTypes.filter((t) => t !== type)
        : [...prev.objectiveTypes, type as any],
    }));
  };

  const handleStatusToggle = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status as any)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status as any],
    }));
  };

  const typeLabels: Record<string, string> = {
    strategic: "Estratégico",
    tactical: "Tático",
    operational: "Operacional",
  };

  const statusLabels: Record<string, string> = {
    planned: "Planejado",
    active: "Ativo",
    risk: "Em Risco",
    completed: "Concluído",
    canceled: "Cancelado",
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Type filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 h-9 text-xs">
              Tipo
              {filters.objectiveTypes.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {filters.objectiveTypes.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="start">
            <div className="space-y-2">
              <h4 className="font-medium text-xs">Tipo de Objetivo</h4>
              <Separator />
              <div className="space-y-1.5">
                {Object.entries(typeLabels).map(([value, label]) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filter-type-${value}`}
                      checked={filters.objectiveTypes.includes(value as any)}
                      onCheckedChange={() => handleTypeToggle(value)}
                    />
                    <Label htmlFor={`filter-type-${value}`} className="text-xs cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Status filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 h-9 text-xs">
              Status
              {filters.statuses.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {filters.statuses.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="start">
            <div className="space-y-2">
              <h4 className="font-medium text-xs">Status</h4>
              <Separator />
              <div className="space-y-1.5">
                {Object.entries(statusLabels).map(([value, label]) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filter-status-${value}`}
                      checked={filters.statuses.includes(value as any)}
                      onCheckedChange={() => handleStatusToggle(value)}
                    />
                    <Label htmlFor={`filter-status-${value}`} className="text-xs cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Period filter */}
        <Select
          value={filters.periodId || "all"}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, periodId: value === "all" ? null : value }))
          }
        >
          <SelectTrigger className="w-36 h-9 text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Departments */}
        {departments.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-9 text-xs">
                <Building2 className="h-3 w-3" />
                Área
                {filters.departments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {filters.departments.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-2">
                <h4 className="font-medium text-xs">Áreas</h4>
                <Separator />
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {departments.map((dept) => (
                    <div key={dept} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dept-${dept}`}
                        checked={filters.departments.includes(dept)}
                        onCheckedChange={() => handleDepartmentToggle(dept)}
                      />
                      <Label htmlFor={`dept-${dept}`} className="text-xs cursor-pointer">
                        {dept}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Responsible */}
        {responsibleUsers.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-9 text-xs">
                <User className="h-3 w-3" />
                Dono
                {filters.responsibleIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {filters.responsibleIds.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-2">
                <h4 className="font-medium text-xs">Responsáveis</h4>
                <Separator />
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {responsibleUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={filters.responsibleIds.includes(user.id)}
                        onCheckedChange={() => handleResponsibleToggle(user.id)}
                      />
                      <Label htmlFor={`user-${user.id}`} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback className="text-[8px]">{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{user.name}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Clear */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-9 text-xs">
            <X className="h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {filters.objectiveTypes.map((type) => (
            <Badge key={type} variant="secondary" className="gap-1 text-xs">
              {typeLabels[type] || type}
              <button onClick={() => handleTypeToggle(type)} className="ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.statuses.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1 text-xs">
              {statusLabels[status] || status}
              <button onClick={() => handleStatusToggle(status)} className="ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.periodId && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {periods.find((p) => p.id === filters.periodId)?.name || "Período"}
              <button onClick={() => setFilters((p) => ({ ...p, periodId: null }))} className="ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.departments.map((dept) => (
            <Badge key={dept} variant="secondary" className="gap-1 text-xs">
              {dept}
              <button onClick={() => handleDepartmentToggle(dept)} className="ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.responsibleIds.map((userId) => (
            <Badge key={userId} variant="secondary" className="gap-1 text-xs">
              {responsibleUsers.find((u) => u.id === userId)?.name || "Usuário"}
              <button onClick={() => handleResponsibleToggle(userId)} className="ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
