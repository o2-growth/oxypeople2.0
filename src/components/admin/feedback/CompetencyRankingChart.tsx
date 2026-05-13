import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeedbackCompetency } from "@/hooks/useFeedbackMetrics";

interface Props {
  data: FeedbackCompetency[];
  onTagClick: (tag: string) => void;
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
];

export function CompetencyRankingChart({ data, onTagClick }: Props) {
  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top competências</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma tag usada no período.</p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...data].sort((a, b) => b.cnt - a.cnt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Top competências</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
            <Tooltip />
            <Bar dataKey="cnt" name="Usos" radius={[0, 4, 4, 0]}>
              {sorted.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  cursor="pointer"
                  onClick={() => onTagClick(sorted[i].name)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
