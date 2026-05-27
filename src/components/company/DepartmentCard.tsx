import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Users, Trash2, Building2 } from "lucide-react";
import type { Department } from "@/hooks/useDepartmentsManager";

interface DepartmentCardProps {
  department: Department;
  onEdit: (department: Department) => void;
  onManage: (department: Department) => void;
  onDelete: (departmentId: string) => void;
}

export function DepartmentCard({ department, onEdit, onManage, onDelete }: DepartmentCardProps) {
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${department.color}20` }}
            >
              <Building2 className="h-5 w-5" style={{ color: department.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{department.name}</p>
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: department.color }}
                />
              </div>
              {department.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {department.description}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(department)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManage(department)}>
                <Users className="mr-2 h-4 w-4" />
                Gerenciar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(department.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Leader Section */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Líder:</span>
          {department.leader ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={department.leader.avatar_url || ""} />
                <AvatarFallback className="text-xs">
                  {getInitials(department.leader.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{department.leader.full_name || "Sem nome"}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground italic">Não definido</span>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {department.member_count} membro{department.member_count !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Building2 className="h-3 w-3" />
            {department.team_count} time{department.team_count !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
