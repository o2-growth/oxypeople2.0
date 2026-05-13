import { useRef } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { CompetencyTable } from "./CompetencyTable";
import type { PDICompetency } from "@/hooks/usePDICompetencies";

interface Props {
  competencies: PDICompetency[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, data }: any) {
  if (!active || !payload?.length) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullName = (data as any[]).find((d: any) => d.subject === label)?.fullName ?? label;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const current = payload.find((p: any) => p.dataKey === "current")?.value ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const target = payload.find((p: any) => p.dataKey === "target")?.value ?? 0;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium mb-1">{fullName}</p>
      <p>
        Atual: <strong>{current}/5</strong>
      </p>
      <p>
        Alvo: <strong>{target}/5</strong>
      </p>
      <p>
        Gap: <strong>{target - current}</strong>
      </p>
    </div>
  );
}

export function CompetencyRadar({ competencies }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (competencies.length < 3) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Adicione pelo menos 3 competências para visualizar o mapa de competências.
      </div>
    );
  }

  const data = competencies.map((c) => ({
    subject: c.name.length > 18 ? c.name.slice(0, 18) + "…" : c.name,
    fullName: c.name,
    current: c.current_level,
    target: c.target_level,
  }));

  const handleExport = () => {
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    canvas.width = svgEl.clientWidth || 600;
    canvas.height = svgEl.clientHeight || 400;
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement("a");
      a.download = "competencias-radar.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
    trackEvent("pdi_radar_exported");
  };

  return (
    <div className="space-y-3">
      <div ref={containerRef}>
        <ResponsiveContainer width="100%" height={380}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tick={{ fontSize: 10 }}
              tickCount={6}
            />
            <Radar
              name="Nível atual"
              dataKey="current"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Radar
              name="Nível alvo"
              dataKey="target"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Tooltip content={<CustomTooltip data={data} />} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Baixar PNG
        </Button>
      </div>
      <CompetencyTable competencies={competencies} />
    </div>
  );
}
