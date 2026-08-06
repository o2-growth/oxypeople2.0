import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Team,
  useTeamMembers,
  useCompanyMembers,
  useAddTeamMember,
  useRemoveTeamMember,
  useTeamsByUser,
} from "@/hooks/useTeams";
import { Search, UserPlus, UserMinus, Loader2, Users } from "lucide-react";
import { isTeamLead } from "@/lib/teams/roles";

interface TeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
}

export function TeamMembersDialog({ open, onOpenChange, team }: TeamMembersDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMembers, setShowAddMembers] = useState(false);

  const { data: teamMembers = [], isLoading: loadingMembers } = useTeamMembers(team?.id || null);
  const { data: companyMembers = [], isLoading: loadingCompany } = useCompanyMembers();
  const { data: timesPorPessoa = {} } = useTeamsByUser();

  /**
   * Os outros times da pessoa. Aparece como aviso ao lado do nome para que o
   * vínculo duplo — proposital em quem acumula duas frentes — não seja lido
   * como cadastro repetido por quem estiver arrumando a lista.
   */
  const outrosTimes = (userId: string) =>
    (timesPorPessoa[userId] ?? []).filter((t) => t.id !== team?.id);

  const addMember = useAddTeamMember();
  const removeMember = useRemoveTeamMember();

  const teamMemberIds = useMemo(
    () => new Set(teamMembers.map((m) => m.user_id)),
    [teamMembers]
  );

  const availableMembers = useMemo(() => {
    return companyMembers
      .filter((m) => m.user_id && !teamMemberIds.has(m.user_id))
      .filter((m) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const name = m.user?.full_name || "";
        const email = m.user?.email || "";
        return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
      });
  }, [companyMembers, teamMemberIds, searchQuery]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return teamMembers;
    const query = searchQuery.toLowerCase();
    return teamMembers.filter(
      (m) =>
        m.user?.full_name?.toLowerCase().includes(query) ||
        m.user?.email?.toLowerCase().includes(query)
    );
  }, [teamMembers, searchQuery]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddMember = async (userId: string) => {
    if (!team) return;
    await addMember.mutateAsync({ teamId: team.id, userId });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team) return;
    await removeMember.mutateAsync({ memberId, teamId: team.id });
  };

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros de {team.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar membros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Toggle Add Members */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {teamMembers.length} {teamMembers.length === 1 ? "membro" : "membros"}
            </span>
            <Button
              variant={showAddMembers ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowAddMembers(!showAddMembers)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {showAddMembers ? "Ver Membros" : "Adicionar"}
            </Button>
          </div>

          {/* Members List */}
          <ScrollArea className="h-[300px] pr-4">
            {loadingMembers || loadingCompany ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : showAddMembers ? (
              // Available members to add
              <div className="space-y-2">
                {availableMembers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {searchQuery
                      ? "Nenhum membro encontrado"
                      : "Todos os membros já estão na equipe"}
                  </p>
                ) : (
                  availableMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.user?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(member.user?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {member.user?.full_name || "Sem nome"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.user?.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddMember(member.user_id)}
                        disabled={addMember.isPending}
                      >
                        {addMember.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Current team members
              <div className="space-y-2">
                {filteredMembers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {searchQuery
                      ? "Nenhum membro encontrado"
                      : "Nenhum membro na equipe ainda"}
                  </p>
                ) : (
                  filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.user?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(member.user?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {member.user?.full_name || "Sem nome"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.user?.email}
                          </p>
                        </div>
                        {isTeamLead(member.role) && (
                          <Badge variant="secondary" className="text-xs">
                            Líder
                          </Badge>
                        )}
                        {outrosTimes(member.user_id).map((t) => (
                          <Badge key={t.id} variant="outline" className="text-xs font-normal">
                            também em {t.name}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removeMember.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {removeMember.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
