import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TopCompetency } from "@/hooks/usePDIDashboard";

interface TopCompetenciesProps {
  data: TopCompetency[];
}

function truncate(str: string, max = 20): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export function TopCompetencies({ data }: TopCompetenciesProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhuma competência registrada ainda.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    name: truncate(d.name),
    fullName: d.name,
    count: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <XAxis type="number" fontSize={12} stroke="hsl(var(--muted-foreground))" />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          fontSize={12}
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            borderColor: "hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value: number, _name, payload) => {
            const fullName = (payload as unknown as { payload: { fullName: string } })?.payload
              ?.fullName;
            return [value, fullName ?? "Competência"];
          }}
          labelFormatter={() => ""}
        />
        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
