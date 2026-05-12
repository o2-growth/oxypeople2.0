export interface PulseDueParams {
  active: boolean;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  send_hour_utc: number;
  last_dispatched_at: string | null;
  created_at: string;
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function isDue(params: PulseDueParams, now: Date = new Date()): boolean {
  if (!params.active) return false;

  if (now.getUTCHours() !== params.send_hour_utc) return false;

  if (params.last_dispatched_at) {
    const diffMs = now.getTime() - new Date(params.last_dispatched_at).getTime();
    if (diffMs < 23 * 3_600_000) return false;
  }

  const dow = now.getUTCDay();
  const dom = now.getUTCDate();

  switch (params.frequency) {
    case "weekly":
      return dow === (params.day_of_week ?? 1);
    case "biweekly": {
      if (dow !== (params.day_of_week ?? 1)) return false;
      return (isoWeek(now) - isoWeek(new Date(params.created_at))) % 2 === 0;
    }
    case "monthly":
      return dom === (params.day_of_month ?? 1);
    default:
      return false;
  }
}
