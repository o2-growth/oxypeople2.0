import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Building2, Mail, Calendar, Shield, Pencil } from "lucide-react";
import { useState } from "react";
import type { CompanyMember } from "@/hooks/usePeopleList";
import { EditMemberDialog } from "@/components/hr/EditMemberDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const roleLabels: Record<string, string> = { owner: "Proprietário", admin: "Admin", manager: "Gestor", member: "Membro" };
const statusLabels: Record<string, string> = { active: "Ativo", invited: "Convidado", pending: "Pendente", inactive: "Inativo" };
const statusColors: Record<string, string> = { active: "bg-success/10 text-success border-success/20", invited: "bg-accent/10 text-accent border-accent/20", pending: "bg-warning/10 text-warning border-warning/20", inactive: "bg-muted text-muted-foreground" };

interface Props {
  member: CompanyMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
}

function getInitials(name?: string | null) {
  if (!name) return "??";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export function MemberDetailSheet({ member, open, onOpenChange, isAdmin }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {member && (
            <>
              <SheetHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={member.user?.avatar_url || undefined} />
                      <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                        {getInitials(member.user?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <SheetTitle className="text-lg">{member.user?.full_name || "Sem nome"}</SheetTitle>
                      <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Badge variant="outline">{roleLabels[member.role || "member"]}</Badge>
                        <Badge variant="outline" className={statusColors[member.status]}>{statusLabels[member.status]}</Badge>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setEditOpen(true)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  )}
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4 text-sm">
                {member.position && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Briefcase className="h-4 w-4 shrink-0" />
                    <span>{member.position}</span>
                  </div>
                )}
                {member.department_info?.name && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span>{member.department_info.name}</span>
                  </div>
                )}
                {member.user?.email && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <a href={`mailto:${member.user.email}`} className="hover:text-foreground transition-colors truncate">
                      {member.user.email}
                    </a>
                  </div>
                )}
                {member.hire_date && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Admissão: {format(new Date(member.hire_date), "d 'de' MMMM yyyy", { locale: ptBR })}</span>
                  </div>
                )}
                {(member.joined_at || member.created_at) && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Shield className="h-4 w-4 shrink-0" />
                    <span>Membro desde: {format(new Date(member.joined_at || member.created_at), "MMM yyyy", { locale: ptBR })}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {member && (
        <EditMemberDialog
          member={member}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </>
  );
}
