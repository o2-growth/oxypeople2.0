import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, X, Loader2 } from "lucide-react";
import {
  useDepartmentMembers,
  useCompanyMembersWithoutDepartment,
  useAssignMemberToDepartment,
  useRemoveMemberFromDepartment,
} from "@/hooks/useDepartmentsManager";

interface DepartmentMembersListProps {
  departmentId: string;
}

export function DepartmentMembersList({ departmentId }: DepartmentMembersListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const { data: members = [], isLoading } = useDepartmentMembers(departmentId);
  const { data: availableMembers = [] } = useCompanyMembersWithoutDepartment();

  const assignMember = useAssignMemberToDepartment();
  const removeMember = useRemoveMemberFromDepartment();

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddMember = async () => {
    if (!selectedMemberId) return;

    try {
      await assignMember.mutateAsync({
        membershipId: selectedMemberId,
        departmentId,
      });
      setSelectedMemberId("");
      setIsAdding(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    try {
      await removeMember.mutateAsync(membershipId);
    } catch {
      // Error handled in hook
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Member Section */}
      <div className="flex items-center gap-2">
        {isAdding ? (
          <>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um membro" />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    Todos os membros já estão em áreas
                  </div>
                ) : (
                  availableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.user?.avatar_url || ""} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.user?.full_name || null)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.user?.full_name || member.user?.email}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleAddMember}
              disabled={!selectedMemberId || assignMember.isPending}
            >
              {assignMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Adicionar Membro
          </Button>
        )}
      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhum membro nesta área</p>
          <p className="text-sm mt-1">Adicione membros usando o botão acima</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.user?.avatar_url || ""} />
                  <AvatarFallback>
                    {getInitials(member.user?.full_name || null)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{member.user?.full_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveMember(member.id)}
                disabled={removeMember.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
