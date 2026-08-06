import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/QueryError";
import { TeamTree } from "@/components/teams/TeamTree";
import { CreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { TeamMembersDialog } from "@/components/teams/TeamMembersDialog";
import {
  Team,
  useTeams,
  useDeleteTeam,
  useTeamMembersByTeam,
} from "@/hooks/useTeams";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Users, Plus, Search } from "lucide-react";
import { toast } from "sonner";

/** Skeleton sob medida para o grid de cards de time (mantém o PageHeader visível). */
function TeamsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function Teams() {
  // Quem não é admin enxerga a estrutura e não a altera. Antes a página
  // expulsava com "Sem permissão", mas o item "Times" aparece no menu do
  // gestor — ele clicava e era mandado de volta para a home. Saber quem está
  // em que time não é informação restrita; mexer é que é.
  const { isAdmin, isLoading: permsLoading } = useUserPermissions();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: teams = [],
    isLoading: teamsLoading,
    isError: teamsError,
    refetch: refetchTeams,
  } = useTeams();

  const teamIds = teams.map((team) => team.id);
  const {
    data: membersByTeam = {},
    isLoading: countsLoading,
    isError: countsError,
    refetch: refetchCounts,
  } = useTeamMembersByTeam(teamIds);

  const deleteTeam = useDeleteTeam();

  const filteredTeams = teams.filter((team) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      team.name.toLowerCase().includes(query) ||
      team.description?.toLowerCase().includes(query) ||
      team.department?.toLowerCase().includes(query)
    );
  });

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setCreateDialogOpen(true);
  };

  const handleDelete = async (teamId: string) => {
    await deleteTeam.mutateAsync(teamId);
  };

  const handleManageMembers = (team: Team) => {
    setSelectedTeam(team);
    setMembersDialogOpen(true);
  };

  const handleCreateDialogClose = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setEditingTeam(null);
    }
  };

  const handleRetry = () => {
    refetchTeams();
    refetchCounts();
  };

  if (permsLoading) {
    return (
      <AppLayout>
        <TeamsGridSkeleton />
      </AppLayout>
    );
  }

  // Loading combinado: só renderiza os cards quando times E contagens chegaram
  // juntos — evita o flicker de "0 membros" enquanto a contagem carrega.
  const isLoading = teamsLoading || countsLoading;
  const isError = teamsError || countsError;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Times"
          description={
            isAdmin
              ? "Gerencie as equipes da sua empresa"
              : "Áreas, times e squads da empresa"
          }
          icon={Users}
          actions={
            isAdmin ? (
              <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Novo Time
              </Button>
            ) : undefined
          }
        />

        {isLoading ? (
          <TeamsGridSkeleton />
        ) : isError ? (
          <QueryError
            message="Não foi possível carregar os times."
            onRetry={handleRetry}
          />
        ) : teams.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum time criado"
            description={
              isAdmin
                ? "Crie seu primeiro time para organizar os membros da empresa."
                : "A empresa ainda não organizou os times."
            }
            action={
              isAdmin
                ? { label: "Criar time", onClick: () => setCreateDialogOpen(true) }
                : undefined
            }
          />
        ) : (
          <>
            {/* Busca */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar equipes"
                placeholder="Buscar equipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <TeamTree
              teams={filteredTeams}
              membersByTeam={membersByTeam}
              onManageMembers={handleManageMembers}
              onEdit={isAdmin ? handleEdit : undefined}
              onDelete={isAdmin ? handleDelete : undefined}
              canManage={isAdmin}
              isSearching={!!searchQuery}
            />
          </>
        )}

        {/* Dialogs */}
        <CreateTeamDialog
          open={createDialogOpen}
          onOpenChange={handleCreateDialogClose}
          editingTeam={editingTeam}
        />

        <TeamMembersDialog
          open={membersDialogOpen}
          onOpenChange={setMembersDialogOpen}
          team={selectedTeam}
        />
      </div>
    </AppLayout>
  );
}
