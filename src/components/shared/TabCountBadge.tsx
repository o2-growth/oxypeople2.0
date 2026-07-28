import { cn } from "@/lib/utils";

type TabCountTone = "primary" | "destructive" | "warning";

const TONE_CLASS: Record<TabCountTone, string> = {
  primary: "bg-primary/15",
  destructive: "bg-destructive/15",
  warning: "bg-warning/15",
};

interface TabCountBadgeProps {
  count: number;
  /** Cor do badge (padrão: primary). */
  tone?: TabCountTone;
  className?: string;
}

/**
 * Badge de contagem para abas (ex.: "Ações 3").
 *
 * Consolida os `<span className="ml-1.5 rounded-full bg-primary/15 …">`
 * repetidos em OneOnOnes, PDIDetail e TimeOff. Retorna `null` quando a
 * contagem é 0 — dispensa o guard `count > 0 &&` no call-site.
 */
export function TabCountBadge({ count, tone = "primary", className }: TabCountBadgeProps) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
        TONE_CLASS[tone],
        className,
      )}
    >
      {count}
    </span>
  );
}
