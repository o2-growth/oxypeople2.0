import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Settings,
  Plus,
  Copy,
  Link,
  List,
  GitBranchPlus,
  MessageSquare,
  Users,
  ClipboardList,
} from "lucide-react";
import type { ObjectiveWithDetails } from "@/hooks/useObjectives";
import type { Checkin } from "@/hooks/useCheckins";
import { CommitmentTypeBadge } from "./CommitmentTypeBadge";
import { ProgressChart } from "./ProgressChart";
import { ProgressDonut } from "./ProgressDonut";

interface ObjectiveHeroProps {
  objective: ObjectiveWithDetails;
  parent: ObjectiveWithDetails | null;
  checkins: Checkin[];
  periodStart?: string;
  periodEnd?: string;
  commentCount: number;
  activeTab: string;
  hasKRs: boolean;
  /** Se o usuário pode criar um novo resultado (KR ou objetivo filho). */
  canCreateResult: boolean;
  onTabChange: (tab: string) => void;
  onNavigate: (id: string) => void;
  onNewResult: () => void;
  onBulkCheckin: () => void;
  onDuplicate: () => void;
  onCopyLink: () => void;
}

/**
 * Cabeçalho (hero card) do detalhe do objetivo: título + tipo de compromisso,
 * link para o objetivo pai, barra de ações (abas, novo resultado, check-in em
 * massa, duplicar/copiar link) e o painel de progresso (donut + gráfico de linha).
 */
export function ObjectiveHero({
  objective,
  parent,
  checkins,
  periodStart,
  periodEnd,
  commentCount,
  activeTab,
  hasKRs,
  canCreateResult,
  onTabChange,
  onNavigate,
  onNewResult,
  onBulkCheckin,
  onDuplicate,
  onCopyLink,
}: ObjectiveHeroProps) {
  const firstKr = objective.key_results[0];

  return (
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
                    onClick={() => onNavigate(parent.id)}
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
                onClick={() => onTabChange("list")}
                title="Lista"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={activeTab === "tree" ? "default" : "outline"}
                size="icon"
                className="h-9 w-9"
                onClick={() => onTabChange("tree")}
                title="Árvore"
              >
                <GitBranchPlus className="h-4 w-4" />
              </Button>
              <Button
                variant={activeTab === "comments" ? "default" : "outline"}
                size="icon"
                className="h-9 w-9 relative"
                onClick={() => onTabChange("comments")}
                title="Discussão"
              >
                <MessageSquare className="h-4 w-4" />
                {commentCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[9px] leading-none rounded-full"
                  >
                    {commentCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeTab === "collaborators" ? "default" : "outline"}
                size="icon"
                className="h-9 w-9"
                onClick={() => onTabChange("collaborators")}
                title="Colaboradores"
              >
                <Users className="h-4 w-4" />
              </Button>
              {canCreateResult && (
                <Button className="gap-2" onClick={onNewResult}>
                  <Plus className="h-4 w-4" />
                  Novo resultado
                </Button>
              )}
              {hasKRs && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onBulkCheckin}
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
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar Objetivo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCopyLink}>
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
          <ProgressDonut progress={objective.progress} />

          {/* Line chart */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Progresso</h4>
            {hasKRs ? (
              <ProgressChart
                checkins={checkins}
                targetValue={Number(firstKr?.target_value || 100)}
                initialValue={Number(firstKr?.initial_value || 0)}
                expectedProgress={Number(objective.expected_progress || 0)}
                unit={firstKr?.unit}
                krType={firstKr?.kr_type}
                direction={firstKr?.direction}
                periodStart={periodStart}
                periodEnd={periodEnd}
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
  );
}
