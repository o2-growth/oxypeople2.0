import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { format, differenceInDays, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Checkin } from "@/hooks/useCheckins";
import { krProgressForValue } from "@/lib/kr-progress";

interface ProgressChartProps {
  checkins: Checkin[];
  targetValue: number;
  initialValue: number;
  expectedProgress?: number;
  unit?: string | null;
  /** Tipo/direção do KR — para o % de cada ponto usar a lib canônica (binary/down). */
  krType?: string | null;
  direction?: string | null;
  /** Period start/end to build the expected curve */
  periodStart?: string;
  periodEnd?: string;
}

export function ProgressChart({
  checkins,
  targetValue,
  initialValue,
  expectedProgress,
  unit,
  krType,
  direction,
  periodStart,
  periodEnd,
}: ProgressChartProps) {
  const chartData = useMemo(() => {
    // Sem faixa mensurável (meta == início) não há o que plotar. KRs "down"
    // (meta < início) seguem válidos — o % de cada ponto vem da lib canônica.
    if (targetValue === initialValue && krType !== "binary") return [];

    // Build expected curve points
    const expectedPoints: { date: Date; expected: number }[] = [];
    if (periodStart && periodEnd) {
      const start = parseISO(periodStart);
      const end = parseISO(periodEnd);
      const totalDays = differenceInDays(end, start);
      if (totalDays > 0) {
        // Generate ~10 points along the period for a smooth line
        const numPoints = Math.min(totalDays, 12);
        for (let i = 0; i <= numPoints; i++) {
          const dayOffset = Math.round((i / numPoints) * totalDays);
          const date = addDays(start, dayOffset);
          const pct = Math.round((dayOffset / totalDays) * 100);
          expectedPoints.push({ date, expected: pct });
        }
      }
    }

    // Build actual (check-in) points
    const sorted = [...checkins].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const actualPoints = sorted.map((c) => {
      const progress = krProgressForValue(Number(c.new_value), {
        target_value: targetValue,
        initial_value: initialValue,
        kr_type: krType,
        direction,
      });
      return {
        date: new Date(c.created_at),
        actual: progress,
        risk: c.perceived_risk,
        value: Number(c.new_value),
      };
    });

    // Merge into a unified timeline
    const allDates = new Map<string, any>();

    expectedPoints.forEach((ep) => {
      const key = format(ep.date, "yyyy-MM-dd");
      allDates.set(key, {
        ...allDates.get(key),
        dateObj: ep.date,
        label: format(ep.date, "dd/MM", { locale: ptBR }),
        fullDate: format(ep.date, "dd MMM yyyy", { locale: ptBR }),
        expected: ep.expected,
      });
    });

    actualPoints.forEach((ap) => {
      const key = format(ap.date, "yyyy-MM-dd");
      const existing = allDates.get(key);
      allDates.set(key, {
        ...existing,
        dateObj: ap.date,
        label: format(ap.date, "dd/MM", { locale: ptBR }),
        fullDate: format(ap.date, "dd MMM yyyy", { locale: ptBR }),
        actual: ap.actual,
        risk: ap.risk,
        value: ap.value,
      });
    });

    // Sort by date
    const merged = Array.from(allDates.values()).sort(
      (a, b) => a.dateObj.getTime() - b.dateObj.getTime()
    );

    // If no period defined but we have check-ins, just return actual points
    if (merged.length === 0 && actualPoints.length > 0) {
      return actualPoints.map((ap) => ({
        label: format(ap.date, "dd/MM", { locale: ptBR }),
        fullDate: format(ap.date, "dd MMM yyyy HH:mm", { locale: ptBR }),
        actual: ap.actual,
        expected: undefined as number | undefined,
      }));
    }

    // If no period and no check-ins, try simple expected line from expectedProgress prop
    if (merged.length === 0 && expectedProgress != null && expectedProgress > 0) {
      return [
        { label: "Início", fullDate: "Início", expected: 0, actual: undefined },
        { label: "Hoje", fullDate: "Hoje", expected: Math.round(expectedProgress), actual: undefined },
      ];
    }

    return merged.map(({ label, fullDate, expected, actual }) => ({
      label,
      fullDate,
      expected,
      actual,
    }));
  }, [checkins, targetValue, initialValue, krType, direction, periodStart, periodEnd, expectedProgress]);

  if (chartData.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center">
          <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">
            Faça check-ins para visualizar a evolução.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasExpected = chartData.some((d) => d.expected != null);
  const hasActual = chartData.some((d) => d.actual != null);

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-xs font-medium flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Meta vs Realizado
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              tickFormatter={(v) => `${v}%`}
              width={35}
            />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number, name: string) => [
                `${value}%`,
                name === "expected" ? "Meta (esperado)" : "Check-in (real)",
              ]}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.fullDate || ""
              }
            />
            <Legend
              iconType="line"
              wrapperStyle={{ fontSize: 10 }}
              formatter={(value) =>
                value === "expected" ? "Meta (esperado)" : "Check-in (real)"
              }
            />
            {/* Expected curve — dashed */}
            {hasExpected && (
              <Line
                type="monotone"
                dataKey="expected"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
              />
            )}
            {/* Actual curve — solid primary */}
            {hasActual && (
              <Line
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        {!hasActual && hasExpected && (
          <p className="text-[10px] text-center text-muted-foreground mt-1">
            Sem check-ins ainda — apenas a curva esperada é exibida.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
