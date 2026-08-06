import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Mail, UserX, UserCheck, Calendar, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { CompanyMember } from "@/hooks/usePeopleList";

interface CollaboratorCardProps {
  member: CompanyMember;
  birthDate?: string | null;
  isAdmin?: boolean;
  onToggleStatus?: (membershipId: string, currentStatus: string) => void;
  /** Abre a ficha, como o clique no nome já faz na tabela. */
  onOpenDetail?: (member: CompanyMember) => void;
  onEdit?: (member: CompanyMember) => void;
}

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Admin",
  manager: "Gestor",
  member: "Membro",
};

export function CollaboratorCard({
  member,
  birthDate,
  isAdmin,
  onToggleStatus,
  onOpenDetail,
  onEdit,
}: CollaboratorCardProps) {
  // Sem o uppercase, o mesmo avatar aparecia "jo" aqui e "JO" na ficha e em Times.
  const initials =
    member.user?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const departmentColor = member.department_info?.color || "#3B82F6";

  const formattedBirthday = birthDate
    ? format(parseISO(birthDate), "dd/MM", { locale: ptBR })
    : null;

  return (
    <Card
      onClick={onOpenDetail ? () => onOpenDetail(member) : undefined}
      className={cn(
        "overflow-hidden transition-shadow hover:shadow-md",
        onOpenDetail && "cursor-pointer",
      )}
    >
      {/* Department Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-2"
        style={{ backgroundColor: `${departmentColor}1f` }}
      >
        {/* A cor da área entra a 12% como fundo e cheia no texto: com o hex
            puro atrás de texto branco fixo, uma área amarela ficava ilegível. */}
        <span className="truncate text-sm font-medium" style={{ color: departmentColor }}>
          {member.department_info?.name || "Sem área"}
        </span>
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label={`Ações de ${member.user?.full_name ?? "colaborador"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(member)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() =>
                  window.open(`mailto:${member.user?.email}`, "_blank")
                }
              >
                <Mail className="h-4 w-4 mr-2" />
                Enviar email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {member.status === "active" ? (
                <DropdownMenuItem
                  onClick={() => onToggleStatus?.(member.id, member.status)}
                  className="text-destructive"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Desativar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => onToggleStatus?.(member.id, member.status)}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Ativar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
        {/* Avatar */}
        <Avatar className="h-20 w-20 border-4 border-background shadow-md -mt-10">
          <AvatarImage
            src={member.user?.avatar_url || undefined}
            alt={member.user?.full_name || ""}
          />
          <AvatarFallback className="text-lg font-semibold bg-muted">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <h3 className="font-semibold text-foreground truncate w-full">
          {member.user?.full_name || member.user?.email || "Sem nome"}
        </h3>

        {/* Position */}
        <div className="w-full">
          <Badge variant="secondary" className="font-normal">
            {member.position || roleLabels[member.role || "member"]}
          </Badge>
        </div>

        {/* Birthday */}
        {formattedBirthday && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Aniversário: {formattedBirthday}</span>
          </div>
        )}

        {/* Contact Icons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              window.open(`mailto:${member.user?.email}`, "_blank")
            }
          >
            <Mail className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
