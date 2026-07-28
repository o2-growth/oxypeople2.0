import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronDown,
  ChevronRight,
  Target,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  User,
} from "lucide-react";
import { useState } from "react";
import { KeyResultItem, KeyResult } from "./KeyResultItem";
import { ObjectiveWithDetails, useDeleteObjective, ObjectiveType } from "@/hooks/useObjectives";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface ObjectiveCardProps {
  objective: ObjectiveWithDetails;
  onEdit?: (objective: ObjectiveWithDetails) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  planned: { label: "Planejado", className: "bg-muted text-muted-foreground" },
  active: { label: "Ativo", className: "bg-green-500/10 text-green-600 border-green-500/30" },
  risk: { label: "Em Risco", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  completed: { label: "Concluído", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  canceled: { label: "Cancelado", className: "bg-red-500/10 text-red-600 border-red-500/30" },
};

const typeConfig: Record<string, { label: string; icon: typeof Target; className: string }> = {
  strategic: { label: "Estratégico", icon: Target, className: "bg-violet-500/10 text-violet-600" },
  tactical: { label: "Tático", icon: Users, className: "bg-blue-500/10 text-blue-600" },
  operational: { label: "Operacional", icon: User, className: "bg-emerald-500/10 text-emerald-600" },
};

const visibilityConfig = {
  private: { label: "Privado" },
  company: { label: "Empresa" },
  public: { label: "Público" },
};

export function ObjectiveCard({ objective, onEdit }: ObjectiveCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { canEditObjective, canDeleteObjective } = useUserPermissions();
  const deleteObjective = useDeleteObjective();

  const status = statusConfig[objective.status] || statusConfig["on-track"];
  const type = typeConfig[objective.type] || typeConfig.personal;
  const TypeIcon = type.icon;

  const canEdit = canEditObjective({
    owner_id: objective.owner_id,
    created_by: objective.created_by,
    team_id: objective.team_id,
  });

  const canDelete = canDeleteObjective({
    created_by: objective.created_by,
  });

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  const ownerName = objective.owner?.full_name || objective.owner?.email || "Usuário";
  const ownerInitials = getInitials(
    objective.owner?.full_name || null,
    objective.owner?.email || ""
  );

  const handleDelete = async () => {
    try {
      await deleteObjective.mutateAsync(objective.id);
      toast.success("Objetivo excluído com sucesso!");
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error("Erro ao excluir objetivo");
    }
  };

  const keyResults: KeyResult[] = objective.key_results.map((kr) => ({
    id: kr.id,
    title: kr.title,
    current_value: Number(kr.current_value),
    target_value: Number(kr.target_value),
    initial_value: Number(kr.initial_value ?? 0),
    unit: kr.unit,
    // Repassa tipo/direção para o KeyResultItem calcular o MESMO % das demais
    // visões (down/binary via lib canônica), sem divergência.
    kr_type: kr.kr_type,
    direction: kr.direction,
  }));

  return (
    <>
      <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
                <Badge variant="secondary" className={type.className}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {type.label}
                </Badge>
                {objective.team && (
                  <Badge variant="outline" className="bg-muted">
                    <Users className="h-3 w-3 mr-1" />
                    {objective.team.name}
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-lg text-foreground">
                {objective.title}
              </h3>
              {objective.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {objective.description}
                </p>
              )}

              {/* Show assignee */}
              {objective.assignee && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <span>Atribuído para:</span>
                  <div className="flex items-center gap-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={objective.assignee.avatar_url || ""} />
                      <AvatarFallback className="text-xs">
                        {getInitials(objective.assignee.full_name, objective.assignee.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {objective.assignee.full_name || objective.assignee.email}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={objective.owner?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {ownerInitials}
                </AvatarFallback>
              </Avatar>

              {(canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(objective)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium text-foreground">
                {objective.progress}%
              </span>
            </div>
            <Progress value={objective.progress} className="h-2" />
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {objective.due_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(objective.due_date), "d MMM yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Target className="h-4 w-4" />
              <span>{keyResults.length} Key Results</span>
            </div>
          </div>

          {/* Key Results Toggle */}
          {keyResults.length > 0 && (
            <>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline w-full"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {isExpanded ? "Ocultar" : "Ver"} Key Results
              </button>

              {/* Key Results List */}
              {isExpanded && (
                <div className="space-y-3 pt-2 border-t">
                  {keyResults.map((kr) => (
                    <KeyResultItem key={kr.id} keyResult={kr} canEdit={canEdit} />
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir objetivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O objetivo "{objective.title}" e
              todos os seus Key Results serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
