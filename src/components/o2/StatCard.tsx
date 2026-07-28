import * as React from "react";
import NumberFlow from "@number-flow/react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * O2 Design System — StatCard
 *
 * Editorial KPI card with mono uppercase eyebrow, Tusker display number,
 * and an optional trend line.
 *
 * Backward compatible with the legacy `dashboard/StatCard` API:
 * - `title`, `value`, `icon`, `onClick` map identically
 * - `change` (number) + `changeLabel` (string) are treated as trend inputs
 * - new `trend?: { value, label? }` is also accepted (preferred shape)
 * - `colorClass` is accepted for compatibility but intentionally ignored
 *   (O2 uses semantic tokens — Lima for positive, red for negative).
 */
export interface O2StatCardTrend {
  value: number;
  label?: string;
}

export interface O2StatCardProps {
  title: string;
  value: number | string;
  /** Sufixo do número (ex.: "%") — preserva a unidade animando o valor via NumberFlow. */
  suffix?: string;
  icon?: React.ReactNode;
  /** Preferred trend shape (O2 spec). */
  trend?: O2StatCardTrend;
  /** Legacy: numeric delta in % (drop-in from dashboard/StatCard). */
  change?: number;
  /** Legacy: trend descriptor (drop-in from dashboard/StatCard). */
  changeLabel?: string;
  /** Accepted for legacy compatibility, intentionally unused. */
  colorClass?: string;
  onClick?: () => void;
  className?: string;
}

function getTrendIcon(value: number) {
  if (value > 0) return <TrendingUp className="h-3 w-3" aria-hidden="true" />;
  if (value < 0) return <TrendingDown className="h-3 w-3" aria-hidden="true" />;
  return <Minus className="h-3 w-3" aria-hidden="true" />;
}

function getTrendToneClass(value: number) {
  if (value > 0) return "text-[var(--lima-500)]";
  if (value < 0) return "text-red-500";
  return "text-[var(--fg-subtle)]";
}

export function StatCard({
  title,
  value,
  suffix,
  icon,
  trend,
  change,
  changeLabel,
  onClick,
  className,
}: O2StatCardProps) {
  // Normalize legacy `change` + `changeLabel` into the unified trend shape.
  const resolvedTrend: O2StatCardTrend | undefined =
    trend ??
    (typeof change === "number" ? { value: change, label: changeLabel } : undefined);

  const isInteractive = typeof onClick === "function";
  const Component = isInteractive ? "button" : "div";

  return (
    <Component
      type={isInteractive ? "button" : undefined}
      onClick={onClick}
      className={cn(
        // wrapper — editorial tile
        "block w-full text-left",
        "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elev)]",
        "p-7 transition-all duration-300",
        // interactive affordances
        isInteractive &&
          "cursor-pointer hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
        className,
      )}
    >
      {/* Eyebrow row: mono uppercase title + optional icon */}
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono uppercase text-[11px] tracking-[0.14em] text-[var(--fg-muted)]">
          {title}
        </p>
        {icon ? (
          <span className="text-[var(--fg-muted)] [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        ) : null}
      </div>

      {/* Display number — NumberFlow anima transições de valor nos KPIs. */}
      <p className="mt-3 font-display font-bold leading-none text-[var(--fg)] text-[clamp(40px,6vw,64px)]">
        {typeof value === "number" ? <NumberFlow value={value} suffix={suffix} /> : value}
      </p>

      {/* Trend */}
      {resolvedTrend ? (
        <div
          className={cn(
            "mt-2 flex items-center gap-1.5 font-mono uppercase text-[11px] tracking-[0.08em]",
            getTrendToneClass(resolvedTrend.value),
          )}
        >
          {getTrendIcon(resolvedTrend.value)}
          <span className="font-semibold">
            {resolvedTrend.value > 0 ? "+" : ""}
            {resolvedTrend.value}%
          </span>
          {resolvedTrend.label ? (
            <span className="text-[var(--fg-subtle)] normal-case tracking-normal">
              {resolvedTrend.label}
            </span>
          ) : null}
        </div>
      ) : null}
    </Component>
  );
}
