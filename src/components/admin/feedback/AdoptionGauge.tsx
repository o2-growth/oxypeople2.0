import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props {
  adoptionPct: number;
  distinctRequesters: number;
  totalMembers: number;
}

function adoptionColor(pct: number): string {
  if (pct >= 70) return "text-green-600";
  if (pct >= 30) return "text-amber-500";
  return "text-red-500";
}

function progressColor(pct: number): string {
  if (pct >= 70) return "bg-green-500";
  if (pct >= 30) return "bg-amber-400";
  return "bg-red-500";
}

export function AdoptionGauge({ adoptionPct, distinctRequesters, totalMembers }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Adoção</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <span className={cn("text-4xl font-bold", adoptionColor(adoptionPct))}>
            {adoptionPct}%
          </span>
          <span className="text-xs text-muted-foreground mb-1">target 80%</span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full transition-all", progressColor(adoptionPct))}
            style={{ width: `${Math.min(adoptionPct, 100)}%` }}
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-foreground/30"
            style={{ left: "80%" }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {distinctRequesters} de {totalMembers} membros ativos criaram pedidos no período
        </p>
      </CardContent>
    </Card>
  );
}
