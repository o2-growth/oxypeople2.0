import { Card, CardContent } from "@/components/ui/card";
import type { FeedbackMetrics } from "@/hooks/useFeedbackMetrics";

interface Props {
  metrics: FeedbackMetrics;
  aggregatedOnly: boolean;
  onCardClick: (filter: string) => void;
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  onClick?: () => void;
}

function KpiCard({ label, value, sub, onClick }: KpiCardProps) {
  return (
    <Card
      className={onClick ? "cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" : ""}
      onClick={onClick}
    >
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function FeedbackKpiCards({ metrics, onCardClick }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <KpiCard
        label="Total de pedidos"
        value={String(metrics.total_requests)}
        onClick={() => onCardClick("all")}
      />
      <KpiCard
        label="Respondidos"
        value={String(metrics.total_responses)}
        sub={`${metrics.total_requests > 0 ? Math.round((metrics.total_responses / metrics.total_requests) * 100) : 0}% do total`}
        onClick={() => onCardClick("answered")}
      />
      <KpiCard
        label="Tempo médio de resposta"
        value={`${metrics.avg_response_hours}h`}
      />
      <KpiCard
        label="No prazo"
        value={`${metrics.pct_answered_on_time}%`}
      />
      <KpiCard
        label="Taxa de recusa"
        value={`${metrics.decline_rate}%`}
        onClick={() => onCardClick("declined")}
      />
      <KpiCard
        label="Pedidos/usuário (média)"
        value={String(metrics.avg_requests_per_user)}
      />
    </div>
  );
}
