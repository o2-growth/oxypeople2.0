import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeedbackMonthlyPoint } from "@/hooks/useFeedbackMetrics";

interface Props {
  data: FeedbackMonthlyPoint[];
}

function monthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${names[parseInt(month, 10) - 1]}/${year.slice(2)}`;
}

export function FeedbackTimelineChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    month: monthLabel(d.month),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Evolução mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area
              type="monotone"
              dataKey="requests"
              name="Pedidos"
              stackId="1"
              stroke="#6366f1"
              fill="#6366f133"
            />
            <Area
              type="monotone"
              dataKey="answered"
              name="Respondidos"
              stackId="2"
              stroke="#22c55e"
              fill="#22c55e33"
            />
            <Area
              type="monotone"
              dataKey="declined"
              name="Recusados"
              stackId="3"
              stroke="#f59e0b"
              fill="#f59e0b22"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
