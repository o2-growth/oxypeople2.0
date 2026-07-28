import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Settings,
  Plus,
  Search,
  Copy,
  Link,
  MoreHorizontal,
  List,
  GitBranchPlus,
  MessageSquare,
  Calendar as CalendarIcon,
  Users,
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Crosshair,
  Layers,
  Zap,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import { useObjectives, usePeriods, ObjectiveWithDetails, ObjectiveType } from "@/hooks/useObjectives";
import { useOkrTier } from "@/hooks/useOkrTier";
import { useAuth } from "@/contexts/AuthContext";
import { useCheckins } from "@/hooks/useCheckins";
import { CollaboratorsTab } from "@/components/objectives/CollaboratorsTab";
import { useRealtimeObjective } from "@/hooks/useRealtimeObjective";
import { useDuplicateObjective } from "@/hooks/useDuplicateObjective";
import { KeyResultItem, KeyResult } from "@/components/objectives/KeyResultItem";
import { ProgressChart } from "@/components/objectives/ProgressChart";
import { ProgressBarStatus } from "@/components/objectives/ProgressBarStatus";
import { StatusBadge } from "@/components/objectives/StatusBadge";
import { OverdueBadge } from "@/components/objectives/OverdueBadge";
import { CreateKeyResultDialog } from "@/components/objectives/CreateKeyResultDialog";
import { CreateObjectiveDialog } from "@/components/objectives/CreateObjectiveDialog";
import { CommitmentTypeBadge } from "@/components/objectives/CommitmentTypeBadge";
import { CommentsTab } from "@/components/objectives/CommentsTab";
import { useObjectiveComments } from "@/hooks/useObjectiveComments";
import { BulkCheckinDialog } from "@/components/objectives/BulkCheckinDialog";
import { AuditHistory } from "@/components/objectives/AuditHistory";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

const typeConfig: Record<ObjectiveType, { label: string; icon: typeof Crosshair; color: string; bgColor: string }> = {
  strategic: { label: "Estratégico", icon: Crosshair, color: "text-violet-400", bgColor: "bg-violet-500/10 border-violet-500/30" },
  tactical: { label: "Tático", icon: Layers, color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/30" },
  operational: { label: "Operacional", icon: Zap, color: "text-emerald-400", bgColor: "bg-emerald-500/10 border-emerald-500/30" },
};

export default function ObjectiveDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: objectives = [], isLoading } = useObjectives();
  const { data: periods = [] } = usePeriods();
  const { tier, isAdmin, canCreateKR, canManageRelations, canManageCollaborators } = useOkrTier();
  const { user } = useAuth();
  const duplicateObjective = useDuplicateObjective();
  const [isCreateKROpen, setIsCreateKROpen] = useState(false);
  const [isCreateChildOpen, setIsCreateChildOpen] = useState(false);
  const [isBulkCheckinOpen, setIsBulkCheckinOpen] = useState(false);
  const [krSearch, setKrSearch] = useState("");
  const [activeTab, setActiveTab] = useState("list");

  useRealtimeObjective(id);
  const { comments: objectiveComments } = useObjectiveComments(id);

  const objective = useMemo(() => {
    if (!id) return null;
    return objectives.find((o) => o.id === id) || null;
  }, [objectives, id]);

  // Find children
  const children = useMemo(() => {
    if (!objective) return [];
    return objectives.filter((o) => o.parent_id === objective.id);
  }, [objectives, objective]);

  // Find parent
  const parent = useMemo(() => {
    if (!objective?.parent_id) return null;
    return objectives.find((o) => o.id === objective.parent_id) || null;
  }, [objectives, objective]);

  const period = objective?.period_id ? periods.find((p) => p.id === objective.period_id) : null;

  // All checkins for the first KR (for the main chart)
  const firstKrId = objective?.key_results?.[0]?.id;
  const { data: checkins = [] } = useCheckins(firstKrId);

  // Total checkin count across all KRs
  const totalCheckins = objective?.key_results?.reduce((acc, kr) => {
    // Simple approximation - we'll show actual count
    return acc;
  }, 0);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-6xl mx-auto">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-1" />
            <Skeleton className="h-64 col-span-2" />
          </div>
          <Skeleton className="h-20" />
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  if (!objective) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Target className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Objetivo não encontrado</h2>
          <p className="text-muted-foreground mb-6">O objetivo solicitado não existe ou foi removido.</p>
          <Button onClick={() => navigate("/objectives")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Objetivos
          </Button>
        </div>
      </AppLayout>
    );
  }

  const type = typeConfig[objective.type];
  const TypeIcon = type.icon;
  const hasKRs = objective.key_results.length > 0;
  const hasChildren = children.length > 0;
  const autoStatus = (objective as any).auto_status || "no_data";

  const daysRemaining = objective.due_date
    ? differenceInDays(new Date(objective.due_date), new Date())
    : null;

  const periodLabel = period
    ? `${period.name || format(new Date(period.start_date), "MMM yyyy", { locale: ptBR })}`
    : objective.due_date
      ? format(new Date(objective.due_date), "QQQ yyyy", { locale: ptBR })
      : "Sem período";

  const keyResults: KeyResult[] = objective.key_results.map((kr) => ({
    id: kr.id,
    title: kr.title,
    current_value: Number(kr.current_value),
    target_value: Number(kr.target_value),
    initial_value: Number((kr as any).initial_value || 0),
    unit: kr.unit,
    objective_id: objective.id,
    weight_percentage: Number((kr as any).weight_percentage || 0),
    last_checkin_at: (kr as any).last_checkin_at,
    kr_type: (kr as any).kr_type,
    direction: (kr as any).direction,
    owner_user_id: (kr as any).owner_user_id,
    confidence: (kr as { confidence?: number | null }).confidence ?? null,
    periodStart: period?.start_date,
    periodEnd: period?.end_date,
  }));

  const filteredKRs = krSearch
    ? keyResults.filter((kr) => kr.title.toLowerCase().includes(krSearch.toLowerCase()))
    : keyResults;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/objectives/${objective.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  // Donut chart data
  const progressValue = objective.progress;
  const donutData = [
    { name: "progress", value: progressValue },
    { name: "remaining", value: Math.max(0, 100 - progressValue) },
  ];

  const progressColor = progressValue >= 70
    ? "hsl(152, 60%, 42%)"
    : progressValue >= 40
      ? "hsl(38, 92%, 50%)"
      : "hsl(0, 72%, 51%)";

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6 -m-6 lg:-m-8 p-6 lg:p-8">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
          onClick={() => navigate("/objectives")}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos Objetivos
        </Button>

        {/* ===== HERO CARD ===== */}
        <Card className="overflow-hidden border-2 border-primary/20">
          <CardContent className="p-0">
            {/* Title bar */}
            <div className="p-6 pb-4 border-b border-border/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight">
                      {objective.title}
                    </h1>
                    <CommitmentTypeBadge value={(objective as { commitment_type?: string }).commitment_type} />
                  </div>
                  {parent && (
                    <p className="text-sm text-muted-foreground mt-1.5">
                      Objetivo pai: "
                      <button
                        className="text-primary hover:underline"
                        onClick={() => navigate(`/objectives/${parent.id}`)}
                      >
                        {parent.title}
                      </button>
                      "
                    </p>
                  )}
                  {objective.description && (
                    <p className="text-sm text-muted-foreground mt-1">{objective.description}</p>
                  )}
                </div>

                {/* Toolbar buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant={activeTab === "list" ? "default" : "outline"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setActiveTab("list")}
                    title="Lista"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={activeTab === "tree" ? "default" : "outline"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setActiveTab("tree")}
                    title="Árvore"
                  >
                    <GitBranchPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={activeTab === "comments" ? "default" : "outline"}
                    size="icon"
                    className="h-9 w-9 relative"
                    onClick={() => setActiveTab("comments")}
                    title="Discussão"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {objectiveComments.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[9px] leading-none rounded-full"
                      >
                        {objectiveComments.length}
                      </Badge>
                    )}
                  </Button>
                  <Button
                    variant={activeTab === "collaborators" ? "default" : "outline"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setActiveTab("collaborators")}
                    title="Colaboradores"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  {(canCreateKR(objective.type) || (objective.type !== "operational" && canManageRelations)) && (
                    <Button
                      className="gap-2"
                      onClick={() => {
                        if (objective.type === "operational" || !hasChildren) {
                          setIsCreateKROpen(true);
                        } else {
                          setIsCreateChildOpen(true);
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Novo resultado
                    </Button>
                  )}
                  {hasKRs && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setIsBulkCheckinOpen(true)}
                      title="Check-in em massa"
                    >
                      <ClipboardList className="h-4 w-4" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => duplicateObjective.mutate(objective)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar Objetivo
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopyLink}>
                        <Link className="h-4 w-4 mr-2" />
                        Copiar Link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Progress section: Donut + Line chart */}
            <div className="p-6 flex flex-col lg:flex-row gap-6">
              {/* Donut */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="relative w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={68}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        <Cell fill={progressColor} />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold" style={{ color: progressColor }}>
                      {progressValue.toFixed(0)}%
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">Status</span>
                  </div>
                </div>
              </div>

              {/* Line chart */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Progresso</h4>
                {hasKRs ? (
                  <ProgressChart
                    checkins={checkins}
                    targetValue={Number(objective.key_results[0]?.target_value || 100)}
                    initialValue={Number((objective.key_results[0] as any)?.initial_value || 0)}
                    expectedProgress={Number((objective as any).expected_progress || 0)}
                    unit={objective.key_results[0]?.unit}
                    periodStart={period?.start_date}
                    periodEnd={period?.end_date}
                  />
                ) : (
                  <Card className="border-dashed h-[180px] flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Adicione Key Results para visualizar o progresso.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== INFO CARDS ROW ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <InfoCard
            label="Responsável"
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="flex items-center gap-2 mt-1">
              {objective.owner && (
                <Avatar className="h-6 w-6">
                  <AvatarImage src={objective.owner.avatar_url || ""} />
                  <AvatarFallback className="text-[9px]">
                    {(objective.owner.full_name || objective.owner.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {objective.owner?.full_name || objective.owner?.email || "—"}
                </p>
              </div>
            </div>
          </InfoCard>

          <InfoCard
            label="Período"
            icon={<CalendarIcon className="h-4 w-4 text-muted-foreground" />}
          >
            <p className="text-sm font-medium mt-1">{periodLabel}</p>
          </InfoCard>

          <InfoCard
            label="Dias restantes"
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          >
            <p className={cn(
              "text-lg font-bold mt-0.5",
              daysRemaining != null && daysRemaining < 0 && "text-destructive"
            )}>
              {daysRemaining != null
                ? daysRemaining >= 0
                  ? `${daysRemaining} dias`
                  : `${Math.abs(daysRemaining)}d atrasado`
                : "—"}
            </p>
          </InfoCard>

          <InfoCard
            label="Resultados chave"
            icon={<Target className="h-4 w-4 text-muted-foreground" />}
          >
            <p className="text-lg font-bold mt-0.5">{objective.key_results.length}</p>
          </InfoCard>

          <InfoCard
            label="Check-ins"
            icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
          >
            <p className="text-lg font-bold mt-0.5">{checkins.length}</p>
          </InfoCard>
        </div>

        {/* ===== CONTENT SECTION ===== */}
        <Card>
          <CardContent className="p-6">
            {activeTab === "list" && (
              <>
                {/* For strategic/tactical: show child objectives */}
                {(objective.type === "strategic" || objective.type === "tactical") && hasChildren && !hasKRs ? (
                  <ChildrenSection
                    objective={objective}
                    children={children}
                    onNavigate={(id) => navigate(`/objectives/${id}`)}
                  />
                ) : hasKRs ? (
                  <KeyResultsSection
                    keyResults={keyResults}
                    filteredKRs={filteredKRs}
                    krSearch={krSearch}
                    setKrSearch={setKrSearch}
                    onCreateKR={() => setIsCreateKROpen(true)}
                    canEdit={tier === "manager" || isAdmin}
                    canCheckin={(kr: KeyResult) =>
                      kr.owner_user_id === user?.id ||
                      objective.owner_id === user?.id ||
                      (objective as any).assignee_id === user?.id ||
                      isAdmin
                    }
                  />
                ) : hasChildren ? (
                  <ChildrenSection
                    objective={objective}
                    children={children}
                    onNavigate={(id) => navigate(`/objectives/${id}`)}
                  />
                ) : (
                  <EmptyState
                    objective={objective}
                    onCreateKR={() => setIsCreateKROpen(true)}
                    onCreateChild={() => setIsCreateChildOpen(true)}
                  />
                )}
              </>
            )}

            {activeTab === "tree" && (
              <AuditHistory entityId={objective.id} />
            )}

            {activeTab === "comments" && (
              <CommentsTab objectiveId={objective.id} />
            )}

            {activeTab === "collaborators" && (
              <CollaboratorsTab
                objective={objective}
                canEdit={canManageCollaborators(objective.owner_id, objective.created_by)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CreateKeyResultDialog
        open={isCreateKROpen}
        onOpenChange={setIsCreateKROpen}
        objectiveId={objective.id}
        objectiveType={objective.type}
      />

      <CreateObjectiveDialog
        open={isCreateChildOpen}
        onOpenChange={setIsCreateChildOpen}
        defaultType={objective.type === "strategic" ? "tactical" : "operational"}
        defaultParentId={objective.id}
      />

      {hasKRs && (
        <BulkCheckinDialog
          open={isBulkCheckinOpen}
          onOpenChange={setIsBulkCheckinOpen}
          objectiveTitle={objective.title}
          keyResults={keyResults.map((kr) => ({
            id: kr.id,
            title: kr.title,
            current_value: kr.current_value,
            target_value: kr.target_value,
            initial_value: kr.initial_value,
            unit: kr.unit,
            objective_id: objective.id,
          }))}
        />
      )}
    </AppLayout>
  );
}

/* ===== Sub-components ===== */

function InfoCard({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="stat-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ChildrenSection({
  objective,
  children: childObjectives,
  onNavigate,
}: {
  objective: ObjectiveWithDetails;
  children: ObjectiveWithDetails[];
  onNavigate: (id: string) => void;
}) {
  const noKRMessage = objective.key_results.length === 0;
  
  return (
    <div className="space-y-4">
      {noKRMessage && (
        <div className="space-y-1 mb-4">
          <h3 className="text-lg font-semibold">Objetivo sem resultados chave definidos</h3>
          <p className="text-sm text-muted-foreground">
            O status deste objetivo é calculado utilizando a média dos objetivos filhos.
          </p>
        </div>
      )}

      <div className="divide-y divide-border">
        {childObjectives.map((child) => {
          const isOverdue = child.type === "operational" && child.key_results.some((kr) => {
            const lastCheckin = (kr as any).last_checkin_at;
            if (!lastCheckin) return true;
            return (Date.now() - new Date(lastCheckin).getTime()) / (1000 * 60 * 60 * 24) > 7;
          });

          return (
            <div
              key={child.id}
              className="flex items-center gap-4 py-4 hover:bg-muted/30 px-2 rounded-lg cursor-pointer transition-colors"
              onClick={() => onNavigate(child.id)}
            >
              {/* Owner avatar */}
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={child.owner?.avatar_url || ""} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {(child.owner?.full_name || child.owner?.email || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Name + badges */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-sm font-medium">
                  {child.owner?.full_name || child.owner?.email || "—"}
                </span>
                {isOverdue && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                    Check In Atrasado
                  </Badge>
                )}
              </div>

              {/* Type + title */}
              <div className="text-center flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Objetivo</p>
                <p className="text-sm font-medium text-primary truncate">{child.title}</p>
              </div>

              {/* Progress */}
              <div className="text-right shrink-0 w-20">
                <p className="text-lg font-bold">{child.progress.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KeyResultsSection({
  keyResults,
  filteredKRs,
  krSearch,
  setKrSearch,
  onCreateKR,
  canEdit = false,
  canCheckin,
}: {
  keyResults: KeyResult[];
  filteredKRs: KeyResult[];
  krSearch: string;
  setKrSearch: (s: string) => void;
  onCreateKR: () => void;
  canEdit?: boolean;
  canCheckin?: (kr: KeyResult) => boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Resultados chave</h3>
        <div className="flex items-center gap-2">
          {keyResults.length > 2 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por resultado-chave ou responsável"
                value={krSearch}
                onChange={(e) => setKrSearch(e.target.value)}
                className="h-9 pl-8 text-sm w-64"
              />
            </div>
          )}
          {krSearch && (
            <Button variant="outline" size="sm" onClick={() => setKrSearch("")}>
              Limpar busca
            </Button>
          )}
        </div>
      </div>

      {/* KR list */}
      <div className="space-y-3">
        {filteredKRs.map((kr) => (
          <KeyResultItem
            key={kr.id}
            keyResult={kr}
            canEdit={canEdit}
            canCheckin={canCheckin ? canCheckin(kr) : false}
            expandable
          />
        ))}
      </div>

      {filteredKRs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {krSearch ? "Nenhum KR encontrado para a busca." : "Nenhum KR cadastrado."}
        </p>
      )}
    </div>
  );
}

function EmptyState({
  objective,
  onCreateKR,
  onCreateChild,
}: {
  objective: ObjectiveWithDetails;
  onCreateKR: () => void;
  onCreateChild: () => void;
}) {
  return (
    <div className="text-center py-12">
      <AlertTriangle className="h-10 w-10 mx-auto text-warning mb-3" />
      <h3 className="text-lg font-medium mb-1">Este objetivo ainda não possui metas nem objetivos filhos.</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Adicione Key Results para medir o progresso ou crie objetivos filhos.
      </p>
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onCreateKR} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar KR
        </Button>
        {objective.type !== "operational" && (
          <Button variant="outline" onClick={onCreateChild} className="gap-2">
            <GitBranchPlus className="h-4 w-4" />
            Criar Objetivo Filho
          </Button>
        )}
      </div>
    </div>
  );
}
