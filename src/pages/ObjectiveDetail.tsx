import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Target } from "lucide-react";
import { useObjectives, usePeriods } from "@/hooks/useObjectives";
import { useOkrTier } from "@/hooks/useOkrTier";
import { useAuth } from "@/contexts/AuthContext";
import { useCheckins } from "@/hooks/useCheckins";
import { useRealtimeObjective } from "@/hooks/useRealtimeObjective";
import { useDuplicateObjective } from "@/hooks/useDuplicateObjective";
import { useObjectiveComments } from "@/hooks/useObjectiveComments";
import { KeyResult } from "@/components/objectives/KeyResultItem";
import { CreateKeyResultDialog } from "@/components/objectives/CreateKeyResultDialog";
import { CreateObjectiveDialog } from "@/components/objectives/CreateObjectiveDialog";
import { BulkCheckinDialog } from "@/components/objectives/BulkCheckinDialog";
import { ObjectiveHero } from "@/components/objectives/ObjectiveHero";
import { ObjectiveInfoCards } from "@/components/objectives/ObjectiveInfoCards";
import { ObjectiveContent } from "@/components/objectives/ObjectiveContent";
import { QueryError } from "@/components/QueryError";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function ObjectiveDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: objectives = [], isLoading, isError, refetch } = useObjectives();
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

  // ----- Estados: loading / erro real / não encontrado -----
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

  if (isError) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto space-y-6">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
            onClick={() => navigate("/objectives")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos Objetivos
          </Button>
          <QueryError
            message="Não foi possível carregar o objetivo."
            onRetry={() => refetch()}
          />
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

  // ----- Dados derivados (objetivo garantidamente presente) -----
  const hasKRs = objective.key_results.length > 0;
  const hasChildren = children.length > 0;

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
    initial_value: Number(kr.initial_value || 0),
    unit: kr.unit,
    objective_id: objective.id,
    weight_percentage: Number(kr.weight_percentage || 0),
    last_checkin_at: kr.last_checkin_at,
    kr_type: kr.kr_type,
    direction: kr.direction,
    owner_user_id: kr.owner_user_id,
    confidence: (kr as { confidence?: number | null }).confidence ?? null,
    periodStart: period?.start_date,
    periodEnd: period?.end_date,
  }));

  const filteredKRs = krSearch
    ? keyResults.filter((kr) => kr.title.toLowerCase().includes(krSearch.toLowerCase()))
    : keyResults;

  const canCreateResult =
    canCreateKR(objective.type) || (objective.type !== "operational" && canManageRelations);

  const handleNewResult = () => {
    if (objective.type === "operational" || !hasChildren) {
      setIsCreateKROpen(true);
    } else {
      setIsCreateChildOpen(true);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/objectives/${objective.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const canCheckin = (kr: KeyResult) =>
    kr.owner_user_id === user?.id ||
    objective.owner_id === user?.id ||
    objective.assignee_id === user?.id ||
    isAdmin;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6 -m-6 lg:-m-8 p-6 lg:p-8">
        {/* Back button (header bespoke) */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
          onClick={() => navigate("/objectives")}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos Objetivos
        </Button>

        <ObjectiveHero
          objective={objective}
          parent={parent}
          checkins={checkins}
          periodStart={period?.start_date}
          periodEnd={period?.end_date}
          commentCount={objectiveComments.length}
          activeTab={activeTab}
          hasKRs={hasKRs}
          canCreateResult={canCreateResult}
          onTabChange={setActiveTab}
          onNavigate={(objId) => navigate(`/objectives/${objId}`)}
          onNewResult={handleNewResult}
          onBulkCheckin={() => setIsBulkCheckinOpen(true)}
          onDuplicate={() => duplicateObjective.mutate(objective)}
          onCopyLink={handleCopyLink}
        />

        <ObjectiveInfoCards
          objective={objective}
          periodLabel={periodLabel}
          daysRemaining={daysRemaining}
          checkinCount={checkins.length}
        />

        <ObjectiveContent
          objective={objective}
          childObjectives={children}
          keyResults={keyResults}
          filteredKRs={filteredKRs}
          krSearch={krSearch}
          setKrSearch={setKrSearch}
          activeTab={activeTab}
          canEditKR={tier === "manager" || isAdmin}
          canCheckin={canCheckin}
          canManageCollaborators={canManageCollaborators(objective.owner_id, objective.created_by)}
          onCreateKR={() => setIsCreateKROpen(true)}
          onCreateChild={() => setIsCreateChildOpen(true)}
          onNavigate={(objId) => navigate(`/objectives/${objId}`)}
        />
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
            kr_type: kr.kr_type,
            direction: kr.direction,
          }))}
        />
      )}
    </AppLayout>
  );
}
