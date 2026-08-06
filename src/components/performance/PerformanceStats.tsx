import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, Clock, TrendingUp, Target } from "lucide-react";

interface PerformanceStatsProps {
  activeCycles: number;
  pendingEvaluations: number;
  completionRate: number;
  averageScore: number;
}

export function PerformanceStats({
  activeCycles,
  pendingEvaluations,
  completionRate,
  averageScore,
}: PerformanceStatsProps) {
  // Tokens do tema, não paleta crua: `bg-blue-100` não responde ao tema escuro
  // e ficava como um quadrado claro no meio da tela preta.
  const stats = [
    {
      label: "Ciclos ativos",
      value: activeCycles,
      icon: ClipboardCheck,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Avaliações pendentes",
      value: pendingEvaluations,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Taxa de conclusão",
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Média geral",
      value: averageScore.toFixed(1),
      icon: Target,
      color: "text-foreground",
      bgColor: "bg-muted",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
