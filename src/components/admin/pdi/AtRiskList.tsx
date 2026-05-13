import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { AtRiskPlan } from "@/hooks/usePDIDashboard";

interface AtRiskListProps {
  items: AtRiskPlan[];
}

function truncate(str: string, max = 40): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export function AtRiskList({ items }: AtRiskListProps) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum PDI em risco no momento.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate(`/pdi/${item.id}`)}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {item.user_name ?? "Usuário desconhecido"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {truncate(item.title)}
              </p>
            </div>
            <span
              className={cn(
                "text-xs font-medium shrink-0",
                item.days_until_target < 0
                  ? "text-destructive"
                  : item.days_until_target < 14
                    ? "text-destructive"
                    : "text-amber-600",
              )}
            >
              {item.days_until_target < 0
                ? `${Math.abs(item.days_until_target)}d atrasado`
                : `${item.days_until_target}d restantes`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={item.progress} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground w-8 text-right">
              {item.progress}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
