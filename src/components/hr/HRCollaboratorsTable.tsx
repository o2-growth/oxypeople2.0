import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal, Pencil, Mail, UserX, UserCheck, Trash2,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from "lucide-react";
import type { CompanyMember } from "@/hooks/usePeopleList";

export type SortCol = "name" | "position" | "department" | "role" | "status";

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

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Admin",
  manager: "Gestor",
  member: "Membro",
};

const columnLabels: Record<SortCol, string> = {
  name: "Colaborador",
  position: "Cargo",
  department: "Área",
  role: "Função",
  status: "Status",
};

interface HRCollaboratorsTableProps {
  people: CompanyMember[];
  isAdmin: boolean;
  sortCol: SortCol | null;
  sortDir: "asc" | "desc";
  onToggleSort: (col: SortCol) => void;
  selectedIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onOpenDetail: (membershipId: string) => void;
  onEdit: (member: CompanyMember) => void;
  onToggleStatus: (membershipId: string, currentStatus: string) => void;
  onDelete: (member: CompanyMember) => void;
}

/**
 * Tabela de colaboradores com cabeçalhos ordenáveis, seleção em massa e menu de
 * ações por linha (editar/e-mail/ativar/desativar/excluir). Extraída de `HR.tsx`.
 */
export function HRCollaboratorsTable({
  people,
  isAdmin,
  sortCol,
  sortDir,
  onToggleSort,
  selectedIds,
  allSelected,
  someSelected,
  onToggleSelectAll,
  onToggleSelect,
  onOpenDetail,
  onEdit,
  onToggleStatus,
  onDelete,
}: HRCollaboratorsTableProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {isAdmin && (
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  data-state={someSelected ? "indeterminate" : undefined}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
            )}
            {(["name", "position", "department", "role", "status"] as SortCol[]).map((col) => {
              const Icon = sortCol === col
                ? sortDir === "asc" ? ChevronUp : ChevronDown
                : ChevronsUpDown;
              return (
                <TableHead key={col}>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-foreground transition-colors"
                    onClick={() => onToggleSort(col)}
                  >
                    {columnLabels[col]}
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </TableHead>
              );
            })}
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((person) => {
            const initials =
              person.user?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
            return (
              <TableRow
                key={person.id}
                className={`hover:bg-muted/30 ${selectedIds.has(person.id) ? "bg-primary/5" : ""}`}
              >
                {isAdmin && (
                  <TableCell className="w-[40px]">
                    <Checkbox
                      checked={selectedIds.has(person.id)}
                      onCheckedChange={() => onToggleSelect(person.id)}
                      aria-label={`Selecionar ${person.user?.full_name}`}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <button
                    type="button"
                    className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                    onClick={() => onOpenDetail(person.id)}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={person.user?.avatar_url || undefined} alt={person.user?.full_name || ""} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium hover:underline">
                        {person.user?.full_name || person.user?.email || "Sem nome"}
                      </p>
                      <p className="text-sm text-muted-foreground">{person.user?.email}</p>
                    </div>
                  </button>
                </TableCell>
                <TableCell>{person.position || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  {person.department_info ? (
                    <Badge variant="outline" style={{
                      backgroundColor: `${person.department_info.color}15`,
                      color: person.department_info.color || undefined,
                      borderColor: `${person.department_info.color}30`,
                    }}>
                      {person.department_info.name}
                    </Badge>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{roleLabels[person.role || "member"]}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[person.status] || ""}>
                    {statusLabels[person.status] || person.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(person); }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`mailto:${person.user?.email}`, "_blank"); }}>
                          <Mail className="h-4 w-4 mr-2" />
                          Enviar email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {person.status === "active" ? (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStatus(person.id, person.status); }} className="text-destructive">
                            <UserX className="h-4 w-4 mr-2" />
                            Desativar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStatus(person.id, person.status); }}>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Ativar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => { e.stopPropagation(); onDelete(person); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir colaborador
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
