import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { MembersList, Member } from "@/components/company/MembersList";
import { MemberDetailSheet } from "@/components/company/MemberDetailSheet";
import { InviteModal } from "@/components/company/InviteModal";
import { CreateDepartmentDialog } from "@/components/company/CreateDepartmentDialog";
import { DepartmentCard } from "@/components/company/DepartmentCard";
import { ManageDepartmentDialog } from "@/components/company/ManageDepartmentDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/QueryError";
import { ListPageSkeleton } from "@/components/ui/page-skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Users,
  UserPlus,
  Globe,
  Mail,
  Search,
  Shield,
  Clock,
  Plus,
} from "lucide-react";
import {
  useDepartmentsWithDetails,
  useDeleteDepartment,
  type Department,
} from "@/hooks/useDepartmentsManager";
import { usePeopleList, usePeopleStats, useUpdateMember, useUpdateMemberStatus } from "@/hooks/usePeopleList";
import { useCompany } from "@/hooks/useCompany";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

function getInitials(name: string | null | undefined): string {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function formatJoinDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "MMM yyyy", { locale: ptBR });
  } catch {
    return "-";
  }
}

/** Formata o identificador do plano ("pro" → "Plano Pro"). */
function formatPlan(plan: string): string {
  const label = plan.charAt(0).toUpperCase() + plan.slice(1);
  return `Plano ${label}`;
}

/** Skeleton de conteúdo de aba (sem cabeçalho — o PageHeader da página já o cobre). */
function TabListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

function TabCardsSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function Company() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: permsLoading } = useUserPermissions();

  useEffect(() => {
    if (!permsLoading && !isAdmin) {
      toast.error("Sem permissão para gerenciar a empresa.");
      navigate("/", { replace: true });
    }
  }, [isAdmin, permsLoading, navigate]);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [createDepartmentOpen, setCreateDepartmentOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [managingDepartment, setManagingDepartment] = useState<Department | null>(null);
  const [deletingDepartmentId, setDeletingDepartmentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("az");
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null);

  const {
    data: departments = [],
    isLoading: isLoadingDepartments,
    isError: isDepartmentsError,
    refetch: refetchDepartments,
  } = useDepartmentsWithDetails();
  const deleteDepartment = useDeleteDepartment();
  const updateMember = useUpdateMember();
  const updateStatus = useUpdateMemberStatus();

  // Real data hooks
  const {
    data: people = [],
    isLoading: isLoadingPeople,
    isError: isPeopleError,
    refetch: refetchPeople,
  } = usePeopleList();
  const {
    data: stats,
    isLoading: isLoadingStats,
    isError: isStatsError,
    refetch: refetchStats,
  } = usePeopleStats();
  const {
    data: company,
    isLoading: isLoadingCompany,
    isError: isCompanyError,
    refetch: refetchCompany,
  } = useCompany();

  // Transform people data to Member format
  const members: Member[] = useMemo(() => {
    return people.map((p) => ({
      id: p.id,
      name: p.user?.full_name || p.user?.email?.split("@")[0] || "Sem nome",
      email: p.user?.email || "",
      avatar: p.user?.avatar_url || "",
      initials: getInitials(p.user?.full_name),
      role: p.role || "member",
      status: p.status,
      department: p.department_info?.name || p.department || "Sem área",
      joinedAt: formatJoinDate(p.joined_at || p.created_at),
    }));
  }, [people]);

  // Filter members (active only for Members tab)
  const activeMembers = useMemo(() => {
    return members.filter((m) => m.status === "active");
  }, [members]);

  // Filter invited members for Invites tab
  const invitedMembers = useMemo(() => {
    return members.filter((m) => m.status === "invited" || m.status === "pending");
  }, [members]);

  // Search filter + ordenação alfabética
  const filteredMembers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const result = query
      ? activeMembers.filter(
          (member) =>
            member.name.toLowerCase().includes(query) ||
            member.email.toLowerCase().includes(query) ||
            member.department.toLowerCase().includes(query)
        )
      : [...activeMembers];
    const dir = sortOrder === "za" ? -1 : 1;
    return result.sort((a, b) =>
      dir * a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
    );
  }, [activeMembers, searchQuery, sortOrder]);

  // Compute dynamic stats
  const computedStats = useMemo(() => {
    const adminCount = members.filter((m) => m.role === "owner" || m.role === "admin").length;
    const managerCount = members.filter((m) => m.role === "manager").length;
    const pendingCount = invitedMembers.length;

    return [
      { label: "Total de Membros", value: stats?.total || 0, icon: Users, color: "text-primary" },
      { label: "Administradores", value: adminCount, icon: Shield, color: "text-destructive" },
      { label: "Gestores", value: managerCount, icon: Users, color: "text-primary" },
      { label: "Convites Pendentes", value: pendingCount, icon: Clock, color: "text-warning" },
    ];
  }, [stats, members, invitedMembers]);

  const handleChangeRole = (membershipId: string, role: string) => {
    const person = people.find((p) => p.id === membershipId);
    if (!person) return;
    updateMember.mutate({
      membershipId,
      userId: person.user_id,
      role: role as "owner" | "admin" | "manager" | "member",
    });
  };

  const handleRemoveMember = (membershipId: string) => {
    setRemovingMemberId(membershipId);
  };

  const handleMemberClick = (membershipId: string) => {
    setDetailMemberId(membershipId);
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setCreateDepartmentOpen(true);
  };

  const handleManageDepartment = (department: Department) => {
    setManagingDepartment(department);
  };

  const handleDeleteDepartment = async () => {
    if (!deletingDepartmentId) return;

    try {
      await deleteDepartment.mutateAsync(deletingDepartmentId);
      setDeletingDepartmentId(null);
    } catch {
      // Error handled in hook
    }
  };

  const handleCloseCreateDialog = (open: boolean) => {
    setCreateDepartmentOpen(open);
    if (!open) {
      setEditingDepartment(null);
    }
  };

  const detailMember = detailMemberId ? people.find((p) => p.id === detailMemberId) ?? null : null;

  const isStatsLoading = isLoadingPeople || isLoadingStats;
  const isStatsErrored = isPeopleError || isStatsError;

  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <ListPageSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Empresa"
          description="Gerencie seu workspace e membros da equipe"
          actions={
            <>
              <Button variant="outline" className="gap-2" onClick={() => setCreateDepartmentOpen(true)}>
                <Plus className="h-4 w-4" />
                Nova Área
              </Button>
              <Button className="gap-2" onClick={() => setInviteModalOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Convidar Membros
              </Button>
            </>
          }
        />

        {/* Company Info Card — dados reais da company do usuário */}
        {isLoadingCompany ? (
          <Card>
            <CardContent className="flex items-center gap-6 p-6">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-72 max-w-full" />
              </div>
            </CardContent>
          </Card>
        ) : isCompanyError ? (
          <Card>
            <CardContent className="p-6">
              <QueryError
                message="Não foi possível carregar os dados da empresa."
                onRetry={() => refetchCompany()}
              />
            </CardContent>
          </Card>
        ) : company ? (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                  <AvatarImage src={company.logo_url ?? ""} alt={company.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {getInitials(company.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-foreground">{company.name}</h2>
                    {company.plan && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {formatPlan(company.plan)}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                    {company.domain && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-4 w-4 shrink-0" />
                        <span className="truncate">{company.domain}</span>
                      </div>
                    )}
                    {company.owner_email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate">{company.owner_email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 shrink-0" />
                      <span>{stats?.total ?? 0} membros</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isStatsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : isStatsErrored ? (
            <Card className="sm:col-span-2 lg:col-span-4">
              <CardContent className="p-0">
                <QueryError
                  message="Não foi possível carregar as estatísticas da equipe."
                  onRetry={() => {
                    refetchPeople();
                    refetchStats();
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            computedStats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Members Section */}
        <Tabs defaultValue="members" className="w-full">
          <TabsList>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Membros
              {activeMembers.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 justify-center">
                  {activeMembers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-2">
              <Building2 className="h-4 w-4" />
              Áreas
              {departments.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 justify-center">
                  {departments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="invites" className="gap-2">
              <Mail className="h-4 w-4" />
              Convites
              {invitedMembers.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 justify-center">
                  {invitedMembers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-6 space-y-4">
            {isLoadingPeople ? (
              <TabListSkeleton rows={4} />
            ) : isPeopleError ? (
              <QueryError
                message="Não foi possível carregar os membros."
                onRetry={refetchPeople}
              />
            ) : activeMembers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum membro ainda"
                description="Convide pessoas para começar a montar sua equipe."
                action={{ label: "Convidar Membros", onClick: () => setInviteModalOpen(true) }}
              />
            ) : (
              <>
                {/* Busca + ordenação */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <label htmlFor="member-search" className="sr-only">
                      Buscar membros
                    </label>
                    <Input
                      id="member-search"
                      placeholder="Buscar membros..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-full sm:w-[180px]" aria-label="Ordenar membros">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="az">Nome (A–Z)</SelectItem>
                      <SelectItem value="za">Nome (Z–A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filteredMembers.length === 0 ? (
                  <EmptyState
                    icon={Search}
                    title="Nenhum membro encontrado"
                    description="Tente ajustar os termos da busca."
                  />
                ) : (
                  <MembersList
                    members={filteredMembers}
                    onChangeRole={handleChangeRole}
                    onRemoveMember={handleRemoveMember}
                    onMemberClick={handleMemberClick}
                  />
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="departments" className="mt-6">
            {isLoadingDepartments ? (
              <TabCardsSkeleton />
            ) : isDepartmentsError ? (
              <QueryError
                message="Não foi possível carregar as áreas."
                onRetry={refetchDepartments}
              />
            ) : departments.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="Nenhuma área criada"
                description="Crie áreas para organizar membros e equipes."
                action={{ label: "Criar Área", onClick: () => setCreateDepartmentOpen(true) }}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {departments.map((dept) => (
                  <DepartmentCard
                    key={dept.id}
                    department={dept}
                    onEdit={handleEditDepartment}
                    onManage={handleManageDepartment}
                    onDelete={(id) => setDeletingDepartmentId(id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invites" className="mt-6">
            {isLoadingPeople ? (
              <TabListSkeleton rows={3} />
            ) : isPeopleError ? (
              <QueryError
                message="Não foi possível carregar os convites."
                onRetry={refetchPeople}
              />
            ) : invitedMembers.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="Nenhum convite pendente"
                description="Todos os convites enviados já foram aceitos."
                action={{ label: "Convidar Membros", onClick: () => setInviteModalOpen(true) }}
              />
            ) : (
              <MembersList
                members={invitedMembers}
                onChangeRole={handleChangeRole}
                onRemoveMember={handleRemoveMember}
                onMemberClick={handleMemberClick}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <InviteModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />

        <CreateDepartmentDialog
          open={createDepartmentOpen}
          onOpenChange={handleCloseCreateDialog}
          editingDepartment={editingDepartment}
        />

        <ManageDepartmentDialog
          open={!!managingDepartment}
          onOpenChange={(open) => !open && setManagingDepartment(null)}
          department={managingDepartment}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingDepartmentId} onOpenChange={() => setDeletingDepartmentId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir área?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Os membros e equipes vinculados a esta
                área terão a associação removida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteDepartment}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteDepartment.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove Member Confirmation */}
        <AlertDialog open={!!removingMemberId} onOpenChange={(open) => { if (!open) setRemovingMemberId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover membro?</AlertDialogTitle>
              <AlertDialogDescription>
                O membro será desativado e perderá acesso ao workspace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (removingMemberId) {
                    updateStatus.mutate({ membershipId: removingMemberId, status: "inactive" });
                    setRemovingMemberId(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Member Detail Sheet */}
        <MemberDetailSheet
          member={detailMember}
          open={!!detailMemberId}
          onOpenChange={(open) => { if (!open) setDetailMemberId(null); }}
          isAdmin={isAdmin}
        />
      </div>
    </AppLayout>
  );
}
