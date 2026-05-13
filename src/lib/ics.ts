const TZ = "America/Sao_Paulo";

const WEEKDAY_MAP: Record<string, string> = {
  Sunday: "SU",
  Monday: "MO",
  Tuesday: "TU",
  Wednesday: "WE",
  Thursday: "TH",
  Friday: "FR",
  Saturday: "SA",
};

function formatLocalDt(date: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const h = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}${get("month")}${get("day")}T${h}${get("minute")}${get("second")}`;
}

function formatUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function dayOfWeek(date: Date): string {
  const name = new Intl.DateTimeFormat("en", {
    timeZone: TZ,
    weekday: "long",
  }).format(date);
  return WEEKDAY_MAP[name] ?? "MO";
}

export function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

function rrule(recurrence: string, start: Date): string | null {
  switch (recurrence) {
    case "weekly":
      return `RRULE:FREQ=WEEKLY;BYDAY=${dayOfWeek(start)}`;
    case "biweekly":
      return `RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=${dayOfWeek(start)}`;
    case "monthly":
      return `RRULE:FREQ=MONTHLY`;
    default:
      return null;
  }
}

export interface IcsMeeting {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  recurrence: string;
}

export interface IcsPerson {
  full_name: string | null;
  email?: string | null;
}

export function buildIcs(
  meeting: IcsMeeting,
  leader: IcsPerson,
  member: IcsPerson,
  detailUrl = "",
  now = new Date(),
): string {
  const start = new Date(meeting.scheduled_at);
  const end = new Date(start.getTime() + meeting.duration_minutes * 60_000);

  const leaderName = leader.full_name ?? "Líder";
  const memberName = member.full_name ?? "Liderado";
  const location = meeting.location || "A definir";
  const summary = `1:1 — ${leaderName} & ${memberName}`;
  const description =
    `Reunião 1:1 agendada via OxyPeople.` +
    (detailUrl ? ` Acesse: ${detailUrl}` : "");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OxyPeople//1on1//PT-BR",
    "BEGIN:VEVENT",
    `UID:${meeting.id}@oxypeople`,
    `DTSTAMP:${formatUtcStamp(now)}`,
    `DTSTART;TZID=${TZ}:${formatLocalDt(start)}`,
    `DTEND;TZID=${TZ}:${formatLocalDt(end)}`,
    `SUMMARY:${icsEscape(summary)}`,
    `LOCATION:${icsEscape(location)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    "STATUS:CONFIRMED",
  ];

  const rule = rrule(meeting.recurrence, start);
  if (rule) lines.push(rule);

  if (leader.email) {
    lines.push(`ORGANIZER;CN=${icsEscape(leaderName)}:mailto:${leader.email}`);
  }
  if (member.email) {
    lines.push(`ATTENDEE;CN=${icsEscape(memberName)};RSVP=TRUE:mailto:${member.email}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export function icsFilename(
  leader: IcsPerson,
  member: IcsPerson,
  scheduledAt: string,
): string {
  const slug = (name: string | null) =>
    (name ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

  const dateStr = scheduledAt.slice(0, 10).replace(/-/g, "");
  return `1on1-${slug(leader.full_name)}-${slug(member.full_name)}-${dateStr}.ics`;
}
