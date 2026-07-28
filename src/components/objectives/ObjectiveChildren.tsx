import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ObjectiveWithDetails } from "@/hooks/useObjectives";

interface ObjectiveChildrenProps {
  objective: ObjectiveWithDetails;
  childObjectives: ObjectiveWithDetails[];
  onNavigate: (id: string) => void;
}

/**
 * Lista de objetivos filhos (para objetivos estratégicos/táticos que agregam o
 * progresso a partir dos filhos, em vez de resultados-chave próprios).
 */
export function ObjectiveChildren({ objective, childObjectives, onNavigate }: ObjectiveChildrenProps) {
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
          const isOverdue =
            child.type === "operational" &&
            child.key_results.some((kr) => {
              const lastCheckin = kr.last_checkin_at;
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
