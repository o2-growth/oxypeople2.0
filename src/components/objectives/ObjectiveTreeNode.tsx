import { useState, useEffect, useMemo, useCallback, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  MoreHorizontal,
  Trash2,
  Plus,
  GitBranchPlus,
  Users,
  Scale,
  Check,
  X,
  Pencil,
} from "lucide-react";
import { KeyResultItem, KeyResult } from "./KeyResultItem";
import { StatusBadge } from "./StatusBadge";
import { OverdueBadge } from "./OverdueBadge";
import { BreakdownObjectiveDialog } from "./BreakdownObjectiveDialog";
import { EditObjectiveDialog } from "./EditObjectiveDialog";
import { ObjectiveWithDetails, useDeleteObjective, ObjectiveType } from "@/hooks/useObjectives";
import { rollup, type WeightOf } from "@/lib/objective-rollup";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useOkrTier } from "@/hooks/useOkrTier";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ObjectiveTreeNodeProps {
  objective: ObjectiveWithDetails;
  depth?: number;
  onCreateChild?: (parentId: string, parentType: ObjectiveType) => void;
  onSelectObjective?: (objective: ObjectiveWithDetails) => void;
  /** Weight percentage passed from parent */
  weightPercentage?: number;
}

const typeConfig: Record<ObjectiveType, { label: string }> = {
  strategic: { label: "Estratégico" },
  tactical: { label: "Tático" },
  operational: { label: "Operacional" },
  personal: { label: "Pessoal" },
  team: { label: "Time" },
  individual: { label: "Individual" },
};

// Paleta do board (estilo Monday) para as linhas de objetivo — único ponto
// tipado, local a este componente (sem CSS vars em index.css, sem util em
// src/lib). São REDESIGN-SENSÍVEIS: cada cor distingue tier/status e preserva
// 1:1 o hex original; não colapsar num único token. Aplicadas via `style` inline.
const TIER_COLOR: Record<ObjectiveType, string> = {
  strategic: "#a25ddc",
  tactical: "#579bfc",
  operational: "#00c875",
  personal: "#6b7280",
  team: "#0ea5e9",
  individual: "#94a3b8",
};

/** Cores das faixas de progresso. */
const PROGRESS_COLOR = { good: "#00c875", warn: "#fdab3d", bad: "#e2445c" } as const;

/** Cor de alerta do badge "Sem KR". */
const WARN_COLOR = "#fdab3d";

/** Verde da ação primária (base + hover) e fundo suave do badge de peso OK. */
const BOARD_CTA = { base: "#00c875", hover: "#00b461", soft: "rgba(0, 200, 117, 0.2)" } as const;

// CSS custom properties locais só para o :hover do botão de salvar (inline
// style não expressa :hover). Valores continuam centralizados em BOARD_CTA.
const boardCtaVars = {
  "--board-cta": BOARD_CTA.base,
  "--board-cta-hover": BOARD_CTA.hover,
} as CSSProperties;

// Marcador do "esperado" na barra dupla (§3.4). Segue a convenção deste
// componente (hex inline, não token): tom de alerta quando o nó está ATRÁS do
// esperado; neutro (slate) quando no alvo/à frente.
const EXPECTED_MARKER = { behind: PROGRESS_COLOR.warn, ontrack: "#64748b" } as const;

const childTypeMap: Record<ObjectiveType, ObjectiveType | null> = {
  strategic: "tactical",
  tactical: "operational",
  operational: null,
  personal: null,
  team: null,
  individual: null,
};

// Rollup (§3.4) — cálculo compartilhado em @/lib/objective-rollup (fonte única).

// Pesos pai→filho (`objective_relations`) em UMA query — dedup por react-query,
// então as N instâncias recursivas do nó compartilham o mesmo cache/fetch.
// RLS vazio ou erro → mapa vazio → `weightedMean` cai para média simples.
function useWeightOf(): WeightOf {
  const { data } = useQuery({
    queryKey: ["objective-relations-weights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("objective_relations")
        .select("child_objective_id, weight_percentage");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const byChild = useMemo(() => {
    const m = new Map<string, number>();
    (data ?? []).forEach((r) => m.set(r.child_objective_id, Number(r.weight_percentage) || 0));
    return m;
  }, [data]);
  return useCallback((childId: string) => byChild.get(childId) ?? 0, [byChild]);
}

export function ObjectiveTreeNode({ objective, depth = 0, onCreateChild, onSelectObjective, weightPercentage }: ObjectiveTreeNodeProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [showKRs, setShowKRs] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { canEditObjective, canDeleteObjective } = useUserPermissions();
  const { canManageRelations } = useOkrTier();
  const deleteObjective = useDeleteObjective();
  const weightOf = useWeightOf();

  // Child weights state
  const [childWeights, setChildWeights] = useState<Record<string, number>>({});
  const [isEditingWeights, setIsEditingWeights] = useState(false);
  const [editWeights, setEditWeights] = useState<Record<string, number>>({});
  const [isSavingWeights, setIsSavingWeights] = useState(false);

  const hasChildren = objective.children && objective.children.length > 0;
  const hasKRs = objective.key_results.length > 0;

  // Load child weights
  useEffect(() => {
    if (!hasChildren) return;
    const load = async () => {
      const { data } = await supabase
        .from("objective_relations")
        .select("child_objective_id, weight_percentage")
        .eq("parent_objective_id", objective.id);

      const w: Record<string, number> = {};
      objective.children!.forEach((c) => {
        const rel = data?.find((r) => r.child_objective_id === c.id);
        w[c.id] = rel ? Number(rel.weight_percentage) : 0;
      });

      // Distribute evenly if all zero
      const total = Object.values(w).reduce((s, v) => s + v, 0);
      if (total === 0 && objective.children!.length > 0) {
        const base = Math.floor(100 / objective.children!.length);
        const remainder = 100 - base * objective.children!.length;
        objective.children!.forEach((c, i) => {
          w[c.id] = base + (i < remainder ? 1 : 0);
        });
      }
      setChildWeights(w);
    };
    load();
  }, [objective.id, hasChildren, objective.children]);

  const isCheckinOverdue = objective.type === "operational" && objective.key_results.length > 0 &&
    objective.key_results.some((kr) => {
      const lastCheckin = (kr as any).last_checkin_at;
      if (!lastCheckin) return true;
      const diff = (Date.now() - new Date(lastCheckin).getTime()) / (1000 * 60 * 60 * 24);
      return diff > 7;
    });

  const hasNoKRWarning = objective.type === "operational" && objective.key_results.length === 0;
  const type = typeConfig[objective.type] || typeConfig.operational;
  const tierColor = TIER_COLOR[objective.type] || TIER_COLOR.operational;
  const canAddChild = childTypeMap[objective.type] !== null;
  const autoStatus = (objective as any).auto_status || "no_data";

  const canEdit = canEditObjective({
    owner_id: objective.owner_id,
    created_by: objective.created_by,
    team_id: objective.team_id,
  });
  const canDelete = canDeleteObjective({ created_by: objective.created_by });

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    return email.charAt(0).toUpperCase();
  };

  const handleDelete = async () => {
    try {
      await deleteObjective.mutateAsync(objective.id);
      toast.success("Objetivo excluído!");
      setShowDeleteDialog(false);
    } catch {
      toast.error("Erro ao excluir objetivo");
    }
  };

  const startEditWeights = () => {
    setEditWeights({ ...childWeights });
    setIsEditingWeights(true);
  };

  const saveWeights = async () => {
    const total = Object.values(editWeights).reduce((s, v) => s + v, 0);
    if (total !== 100) {
      toast.error(`A soma dos pesos deve ser 100% (atual: ${total}%)`);
      return;
    }
    setIsSavingWeights(true);
    try {
      for (const child of objective.children!) {
        await supabase
          .from("objective_relations")
          .update({ weight_percentage: editWeights[child.id] || 0 })
          .eq("parent_objective_id", objective.id)
          .eq("child_objective_id", child.id);
      }
      setChildWeights({ ...editWeights });
      setIsEditingWeights(false);
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      toast.success("Pesos atualizados!");
    } catch {
      toast.error("Erro ao atualizar pesos");
    } finally {
      setIsSavingWeights(false);
    }
  };

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
  }));

  // §3.4 — rollup ponderado (pai = média ponderada dos filhos) + presença do
  // backend; barra dupla real vs esperado quando há esperado > 0.
  const { progress, expected } = rollup(objective, weightOf);
  const behind = expected > 0 && progress < expected;
  const progressColor = progress >= 70 ? PROGRESS_COLOR.good : progress >= 40 ? PROGRESS_COLOR.warn : PROGRESS_COLOR.bad;

  return (
    <>
      <div className={cn(depth > 0 && "ml-6")} style={boardCtaVars}>
        {/* Main Row */}
        <div
          className={cn(
            "group flex items-center h-10 hover:bg-accent/60 transition-colors border-b border-border/30",
            depth === 0 && "border-l-4",
          )}
          style={depth === 0 ? { borderLeftColor: tierColor } : undefined}
        >
          {/* Left: Expand + Title */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 px-3">
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className={cn(
                "shrink-0 p-0.5 rounded hover:bg-muted transition-colors",
                !hasChildren && !hasKRs && "invisible"
              )}
            >
              {isExpanded
                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              }
            </button>

            <span
              className="text-sm text-foreground truncate cursor-pointer hover:text-primary transition-colors"
              onClick={() => navigate(`/objectives/${objective.id}`)}
            >
              {objective.title}
            </span>
          </div>

          {/* Right columns */}
          <div className="flex items-center shrink-0">
            {/* Peso column — shows weight from parent */}
            <div className="w-[55px] flex items-center justify-center px-1">
              {weightPercentage !== undefined && (
                <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                  {weightPercentage}%
                </span>
              )}
            </div>

            {/* Type cell */}
            <div className="w-[100px] flex items-center justify-center px-1">
              <div
                className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-sm text-[10px] font-semibold text-white min-w-[75px] text-center"
                style={{ backgroundColor: tierColor }}
              >
                {type.label}
              </div>
            </div>

            {/* Status cell */}
            <div className="w-[100px] flex items-center justify-center px-1">
              <StatusBadge status={autoStatus} />
            </div>

            {/* Warning badges */}
            <div className="w-[90px] flex items-center justify-center gap-1 px-1">
              <OverdueBadge overdue={isCheckinOverdue} label="Atrasado" />
              {hasNoKRWarning && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm text-white font-semibold" style={{ backgroundColor: WARN_COLOR }}>
                  Sem KR
                </span>
              )}
            </div>

            {/* Progress bar — dupla (real vs esperado) quando há esperado > 0 */}
            <div className="w-[130px] flex items-center gap-2 px-3">
              <div
                className="relative flex-1 h-2 bg-secondary rounded-full overflow-hidden"
                title={expected > 0 ? `Real ${progress}% · Esperado ${expected}%` : undefined}
              >
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%`, backgroundColor: progressColor }}
                />
                {expected > 0 && (
                  <span
                    aria-hidden
                    className="absolute top-0 h-full w-0.5 -translate-x-1/2"
                    style={{ left: `${expected}%`, backgroundColor: behind ? EXPECTED_MARKER.behind : EXPECTED_MARKER.ontrack }}
                  />
                )}
              </div>
              <span
                className="text-[11px] font-bold text-muted-foreground w-8 text-right tabular-nums"
                style={behind ? { color: EXPECTED_MARKER.behind } : undefined}
              >
                {progress}%
              </span>
            </div>

            {/* Owner avatar */}
            <div className="w-[44px] flex items-center justify-center">
              {objective.owner ? (
                <Avatar className="h-7 w-7 ring-2 ring-background">
                  <AvatarImage src={objective.owner.avatar_url || ""} />
                  <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                    {getInitials(objective.owner.full_name, objective.owner.email)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-7 w-7 rounded-full bg-muted" />
              )}
            </div>

            {/* KR / children count */}
            <div className="w-[50px] flex items-center justify-center">
              {hasKRs && (
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {objective.key_results.length} KR
                </span>
              )}
              {hasChildren && !hasKRs && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <Users className="h-3 w-3" />{objective.children!.length}
                </span>
              )}
            </div>

            {/* Due date */}
            <div className="w-[60px] flex items-center justify-center">
              {objective.due_date && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {format(new Date(objective.due_date), "dd MMM", { locale: ptBR })}
                </span>
              )}
            </div>

            {/* Menu */}
            <div className="w-[36px] flex items-center justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canEdit && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowEditDialog(true); }}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canEdit && <DropdownMenuSeparator />}
                  {canAddChild && onCreateChild && canManageRelations && (
                    <DropdownMenuItem onClick={() => onCreateChild(objective.id, childTypeMap[objective.type]!)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar {typeConfig[childTypeMap[objective.type]!]?.label}
                    </DropdownMenuItem>
                  )}
                  {canAddChild && canEdit && canManageRelations && (
                    <DropdownMenuItem onClick={() => setShowBreakdown(true)}>
                      <GitBranchPlus className="h-4 w-4 mr-2" />
                      Quebrar em filhos
                    </DropdownMenuItem>
                  )}
                  {hasChildren && canEdit && canManageRelations && (
                    <DropdownMenuItem onClick={startEditWeights}>
                      <Scale className="h-4 w-4 mr-2" />
                      Editar pesos
                    </DropdownMenuItem>
                  )}
                  {((canAddChild && canManageRelations) || canDelete) && <DropdownMenuSeparator />}
                  {canDelete && (
                    <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Inline weight editing row */}
        {isEditingWeights && hasChildren && (
          <div className="px-3 py-2 bg-muted/30 border-b border-border/30 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                Editar pesos dos filhos
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    Object.values(editWeights).reduce((s, v) => s + v, 0) !== 100 && "bg-destructive/20 text-destructive",
                  )}
                  style={
                    Object.values(editWeights).reduce((s, v) => s + v, 0) === 100
                      ? { backgroundColor: BOARD_CTA.soft, color: BOARD_CTA.base }
                      : undefined
                  }
                >
                  {Object.values(editWeights).reduce((s, v) => s + v, 0)}%
                </span>
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setIsEditingWeights(false)}>
                  <X className="h-3 w-3 mr-1" />Cancelar
                </Button>
                <Button size="sm" className="h-6 text-[10px] px-2 gap-1 bg-[var(--board-cta)] hover:bg-[var(--board-cta-hover)] text-white" onClick={saveWeights} disabled={isSavingWeights}>
                  <Check className="h-3 w-3" />Salvar
                </Button>
              </div>
            </div>
            {objective.children!.map((child) => (
              <div key={child.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground flex-1 truncate">{child.title}</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editWeights[child.id] || 0}
                  onChange={(e) => setEditWeights((prev) => ({ ...prev, [child.id]: Number(e.target.value) }))}
                  className="h-7 w-16 text-xs"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            ))}
          </div>
        )}

        {/* KRs toggle */}
        {isExpanded && hasKRs && (
          <div className="px-3 pb-2 pl-10">
            <button
              onClick={() => setShowKRs(!showKRs)}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              {showKRs ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {showKRs ? "Ocultar" : "Ver"} Key Results ({objective.key_results.length})
            </button>
            {showKRs && (
              <div className="space-y-1.5 mt-2">
                {keyResults.map((kr) => (
                  <KeyResultItem key={kr.id} keyResult={kr} canEdit={canEdit} expandable />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Children — pass weight from parent */}
        {isExpanded && hasChildren && (
          <div className="space-y-0">
            {objective.children!.map((child) => (
              <ObjectiveTreeNode
                key={child.id}
                objective={child}
                depth={depth + 1}
                onCreateChild={onCreateChild}
                onSelectObjective={onSelectObjective}
                weightPercentage={childWeights[child.id]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir objetivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O objetivo "{objective.title}" e todos os seus filhos e Key Results serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Breakdown Dialog */}
      {showBreakdown && (
        <BreakdownObjectiveDialog open={showBreakdown} onOpenChange={setShowBreakdown} parentObjective={objective} />
      )}

      {/* Edit Dialog */}
      <EditObjectiveDialog objective={objective} open={showEditDialog} onOpenChange={setShowEditDialog} />
    </>
  );
}
