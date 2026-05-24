import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, Shield, UserMinus, Mail } from "lucide-react";

export interface Member {
  id: string;
  name: string;
  email: string;
  avatar: string;
  initials: string;
  role: "owner" | "admin" | "manager" | "member";
  status: "active" | "invited" | "pending" | "inactive";
  department: string;
  joinedAt: string;
}

interface MembersListProps {
  members: Member[];
  onChangeRole?: (memberId: string, newRole: string) => void;
  onRemoveMember?: (memberId: string) => void;
  onMemberClick?: (memberId: string) => void;
}

const roleConfig = {
  owner: { label: "Proprietário", className: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  admin: { label: "Admin", className: "bg-red-500/10 text-red-600 border-red-500/30" },
  manager: { label: "Gestor", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  member: { label: "Membro", className: "bg-gray-500/10 text-gray-600 border-gray-500/30" },
};

const statusConfig = {
  active: { label: "Ativo", className: "bg-green-500/10 text-green-600" },
  invited: { label: "Convidado", className: "bg-yellow-500/10 text-yellow-600" },
  pending: { label: "Pendente", className: "bg-orange-500/10 text-orange-600" },
  inactive: { label: "Inativo", className: "bg-gray-500/10 text-gray-600" },
};

const roles: { label: string; value: "owner" | "admin" | "manager" | "member" }[] = [
  { label: "Proprietário", value: "owner" },
  { label: "Admin", value: "admin" },
  { label: "Gestor", value: "manager" },
  { label: "Membro", value: "member" },
];

export function MembersList({ members, onChangeRole, onRemoveMember, onMemberClick }: MembersListProps) {
  const showDropdown = !!onChangeRole || !!onRemoveMember;

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membro</TableHead>
            <TableHead>Função</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Desde</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const role = roleConfig[member.role];
            const status = statusConfig[member.status];

            return (
              <TableRow
                key={member.id}
                className={onMemberClick ? "cursor-pointer" : undefined}
                onClick={() => onMemberClick?.(member.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={role.className}>
                    {role.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{member.department}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={status.className}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{member.joinedAt}</TableCell>
                <TableCell>
                  {showDropdown && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open("mailto:" + member.email, "_blank");
                          }}
                        >
                          <Mail className="h-4 w-4" />
                          Enviar email
                        </DropdownMenuItem>
                        {onChangeRole && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger
                              className="gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Shield className="h-4 w-4" />
                              Alterar função
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {roles.map((r) => (
                                <DropdownMenuItem
                                  key={r.value}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onChangeRole(member.id, r.value);
                                  }}
                                >
                                  {r.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}
                        {onRemoveMember && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveMember(member.id);
                              }}
                              disabled={member.role === "owner"}
                            >
                              <UserMinus className="h-4 w-4" />
                              Remover
                            </DropdownMenuItem>
                          </>
                        )}
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
