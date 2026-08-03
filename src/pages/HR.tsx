import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { HROverviewTab } from "@/components/hr/HROverviewTab";
import { HRCollaboratorsTab } from "@/components/hr/HRCollaboratorsTab";
import { type SortCol } from "@/components/hr/HRCollaboratorsTable";
import { PipefyConfigDialog } from "@/components/hr/PipefyConfigDialog";
import { HRCalendarTab } from "@/components/hr/HRCalendarTab";
import { HRReportsTab } from "@/components/hr/HRReportsTab";
import { HRMoodTab } from "@/components/hr/HRMoodTab";
import { OrganizationChartFlow } from "@/components/people/OrganizationChartFlow";
import { FeedbackTab } from "@/components/people/FeedbackTab";
import { NPSTab } from "@/components/people/NPSTab";
import { InviteModal } from "@/components/company/InviteModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Briefcase, LayoutDashboard, Users, CalendarDays,
  FileBarChart, Network, ClipboardList, BarChart3, UserPlus, Smile,
} from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useInviteMember } from "@/hooks/usePeopleList";

export default function HR() {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Estado da aba Colaboradores elevado para cá (container sempre montado): como
  // o Radix desmonta o TabsContent inativo, manter filtros + seleção aqui em cima
  // preserva-os ao trocar de aba e voltar (evita perder uma seleção em massa).
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [birthdayFilter, setBirthdayFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Ordenação carrega por nome (A–Z); visão inicia em tabela. Elevados junto para 1:1.
  const [sortCol, setSortCol] = useState<SortCol | null>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const { isAdmin } = useUserPermissions();
  const inviteMember = useInviteMember();

  // Limpa a seleção quando um filtro muda (comportamento original). Vive aqui, no
  // container sempre montado, para NÃO disparar ao remontar a aba — o que
  // apagaria a seleção que estamos preservando na troca de aba.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchQuery, departmentFilter, statusFilter, birthdayFilter]);

  const handleInvite = (
    emails: string[],
    role: string,
    newHireData?: { isNewHire: boolean; hireDate?: Date; employmentType?: string }
  ) => {
    inviteMember.mutate({ emails, role, newHireData });
  };

  return (
    <AppLayout>
      <PageHeader
        icon={Briefcase}
        title="Recursos Humanos"
        description="Hub completo de gestão de recursos humanos"
        actions={
          isAdmin ? (
            <Button className="gap-2" onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Convidar Pessoa
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="collaborators" className="gap-2">
            <Users className="h-4 w-4" />
            Colaboradores
          </TabsTrigger>
          <TabsTrigger value="orgchart" className="gap-2">
            <Network className="h-4 w-4" />
            Organograma
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="feedback" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Feedback 30 Dias
              </TabsTrigger>
              <TabsTrigger value="nps" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                NPS
              </TabsTrigger>
              <TabsTrigger value="mood" className="gap-2">
                <Smile className="h-4 w-4" />
                Humor
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileBarChart className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <HROverviewTab onConfigurePipefy={() => setConfigDialogOpen(true)} />
        </TabsContent>

        <TabsContent value="collaborators">
          <HRCollaboratorsTab
            isAdmin={isAdmin}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            departmentFilter={departmentFilter}
            setDepartmentFilter={setDepartmentFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            birthdayFilter={birthdayFilter}
            setBirthdayFilter={setBirthdayFilter}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            sortCol={sortCol}
            setSortCol={setSortCol}
            sortDir={sortDir}
            setSortDir={setSortDir}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        </TabsContent>

        <TabsContent value="orgchart">
          <OrganizationChartFlow />
        </TabsContent>

        <TabsContent value="feedback">
          {isAdmin && <FeedbackTab />}
        </TabsContent>

        <TabsContent value="nps">
          {isAdmin && <NPSTab />}
        </TabsContent>

        <TabsContent value="mood">
          {isAdmin && <HRMoodTab />}
        </TabsContent>

        <TabsContent value="calendar">
          <HRCalendarTab />
        </TabsContent>

        <TabsContent value="reports">
          <HRReportsTab />
        </TabsContent>
      </Tabs>

      {/* Config Dialog */}
      <PipefyConfigDialog open={configDialogOpen} onOpenChange={setConfigDialogOpen} />

      {/* Invite Modal */}
      <InviteModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} onInvite={handleInvite} />
    </AppLayout>
  );
}
