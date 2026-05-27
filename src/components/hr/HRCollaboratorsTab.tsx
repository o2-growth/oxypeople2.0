import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Users } from "lucide-react";
import { HRCollaboratorsFilters } from "./HRCollaboratorsFilters";
import { usePeopleList } from "@/hooks/usePeopleList";
import { useDepartmentOptions } from "@/hooks/usePeopleWithBirthdays";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  active: "Ativo",
  invited: "Convidado",
  pending: "Pendente",
  inactive: "Inativo",
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  invited: "bg-accent/10 text-accent border-accent/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  inactive: "bg-muted text-muted-foreground",
};

export function HRCollaboratorsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("all");

  const { data: people, isLoading } = usePeopleList();
  const { data: departments = [] } = useDepartmentOptions();

  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== "" || departmentFilter !== "all" || statusFilter !== "all" || employmentTypeFilter !== "all";
  }, [searchQuery, departmentFilter, statusFilter, employmentTypeFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setDepartmentFilter("all");
    setStatusFilter("all");
    setEmploymentTypeFilter("all");
  };

  const filteredPeople = useMemo(() => {
    if (!people) return [];
    return people.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = p.user?.full_name?.toLowerCase().includes(q) ||
          p.user?.email?.toLowerCase().includes(q) ||
          p.position?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (departmentFilter !== "all" && p.department_id !== departmentFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (employmentTypeFilter !== "all" && p.employment_type !== employmentTypeFilter) return false;
      return true;
    });
  }, [people, searchQuery, departmentFilter, statusFilter, employmentTypeFilter]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-heading mb-4">
          Quadro de Colaboradores ({filteredPeople.length})
        </CardTitle>
        <HRCollaboratorsFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          departmentFilter={departmentFilter}
          onDepartmentChange={setDepartmentFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          employmentTypeFilter={employmentTypeFilter}
          onEmploymentTypeChange={setEmploymentTypeFilter}
          departments={departments}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              {hasActiveFilters ? "Nenhum resultado encontrado" : "Nenhum colaborador"}
            </h3>
            <p className="text-muted-foreground">
              {hasActiveFilters ? "Tente ajustar os filtros" : "Importe ou convide colaboradores"}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Contratação</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeople.map((person) => {
                  const initials = person.user?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?";
                  return (
                    <TableRow key={person.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={person.user?.avatar_url || undefined} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{person.user?.full_name || "Sem nome"}</p>
                            <p className="text-xs text-muted-foreground">{person.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{person.position || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        {person.department_info ? (
                          <Badge variant="outline" style={{
                            backgroundColor: `${person.department_info.color}15`,
                            color: person.department_info.color || undefined,
                            borderColor: `${person.department_info.color}30`,
                          }}>
                            {person.department_info.name}
                          </Badge>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">{person.employment_type || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm">
                        {person.hire_date ? format(parseISO(person.hire_date), "dd/MM/yyyy", { locale: ptBR }) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[person.status]}>
                          {statusLabels[person.status] || person.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
