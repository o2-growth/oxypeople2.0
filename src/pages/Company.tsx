import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  Settings, 
  Globe, 
  Mail,
  Search,
  Shield,
  Clock,
  Plus,
  Loader2
} from "lucide-react";
import { 
  useDepartmentsWithDetails, 
  useDeleteDepartment,
  type Department 
} from "@/hooks/useDepartmentsManager";
import { usePeopleList, usePeopleStats, useUpdateMember, useUpdateMemberStatus } from "@/hooks/usePeopleList";
import { useUser } from "@/hooks/useUser";
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
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null);

  const { data: departments = [], isLoading: isLoadingDepartments } = useDepartmentsWithDetails();
  const deleteDepartment = useDeleteDepartment();
  const updateMember = useUpdateMember();
  const updateStatus = useUpdateMemberStatus();
  
  // Real data hooks
  const { data: people = [], isLoading: isLoadingPeople } = usePeopleList();
  const { data: stats, isLoading: isLoadingStats } = usePeopleStats();
  const { profile } = useUser();

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
      department: p.department_info?.name || p.department || "Sem departamento",
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

  // Search filter
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return activeMembers;
    const query = searchQuery.toLowerCase();
    return activeMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.department.toLowerCase().includes(query)
    );
  }, [activeMembers, searchQuery]);

  // Compute dynamic stats
  const computedStats = useMemo(() => {
    const adminCount = members.filter((m) => m.role === "owner" || m.role === "admin").length;
    const managerCount = members.filter((m) => m.role === "manager").length;
    const pendingCount = invitedMembers.length;

    return [
      { label: "Total de Membros", value: stats?.total || 0, icon: Users, color: "text-primary" },
      { label: "Administradores", value: adminCount, icon: Shield, color: "text-red-500" },
      { label: "Gestores", value: managerCount, icon: Users, color: "text-blue-500" },
      { label: "Convites Pendentes", value: pendingCount, icon: Clock, color: "text-yellow-500" },
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

  const detailMember = detailMemberId ? people.find(p => p.id === detailMemberId) ?? null : null;

  const isLoading = isLoadingPeople || isLoadingStats;

  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Empresa</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seu workspace e membros da equipe
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setCreateDepartmentOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo Departamento
            </Button>
            <Button className="gap-2" onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Convidar Membros
            </Button>
          </div>
        </div>

        {/* Company Info Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  PH
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-foreground">People Hub Corp</h2>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Plano Pro
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />
                    <span>peoplehub.com</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    <span>admin@peoplehub.com</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{stats?.total || 0} membros</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                Editar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
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
              Departamentos
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
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar membros..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoadingPeople ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhum membro encontrado</h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  {searchQuery 
                    ? "Tente ajustar sua busca" 
                    : "Convide membros para começar"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setInviteModalOpen(true)} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Convidar Membros
                  </Button>
                )}
              </div>
            ) : (
              <MembersList
                members={filteredMembers}
                onChangeRole={handleChangeRole}
                onRemoveMember={handleRemoveMember}
                onMemberClick={handleMemberClick}
              />
            )}
          </TabsContent>

          <TabsContent value="departments" className="mt-6">
            {isLoadingDepartments ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : departments.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhum departamento criado</h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  Crie departamentos para organizar membros e equipes
                </p>
                <Button onClick={() => setCreateDepartmentOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Departamento
                </Button>
              </div>
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
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : invitedMembers.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhum convite pendente</h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  Todos os convites foram aceitos
                </p>
                <Button onClick={() => setInviteModalOpen(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Convidar Membros
                </Button>
              </div>
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
        <InviteModal 
          open={inviteModalOpen} 
          onOpenChange={setInviteModalOpen}
        />

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
              <AlertDialogTitle>Excluir departamento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Os membros e equipes vinculados a este
                departamento terão a associação removida.
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
