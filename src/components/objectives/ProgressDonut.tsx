import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface ProgressDonutProps {
  /** Progresso do objetivo (0–100). */
  progress: number;
}

/**
 * Cor do anel de progresso por faixa de saúde (verde / âmbar / vermelho).
 * Valores literais preservados do design original — não são os tokens de marca
 * (o verde 152° é intencionalmente distinto do Lima 138°) e não devem adaptar
 * ao dark mode, por isso ficam fixos aqui em vez de `hsl(var(--token))`.
 */
function progressHealthColor(progress: number): string {
  if (progress >= 70) return "hsl(152, 60%, 42%)";
  if (progress >= 40) return "hsl(38, 92%, 50%)";
  return "hsl(0, 72%, 51%)";
}

/**
 * Donut de progresso do objetivo (recharts) com o percentual e o rótulo "Status"
 * centralizados. Bloco visual coeso extraído do cabeçalho de ObjectiveDetail.
 */
export function ProgressDonut({ progress }: ProgressDonutProps) {
  const color = progressHealthColor(progress);
  const donutData = [
    { name: "progress", value: progress },
    { name: "remaining", value: Math.max(0, 100 - progress) },
  ];

  return (
    <div className="flex flex-col items-center justify-center shrink-0">
      <div className="relative w-40 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={68}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill="hsl(var(--muted))" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>
            {progress.toFixed(0)}%
          </span>
          <span className="text-xs text-muted-foreground font-medium">Status</span>
        </div>
      </div>
    </div>
  );
}
