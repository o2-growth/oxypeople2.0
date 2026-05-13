import { describe, it, expect } from "vitest";
import { buildIcs, icsEscape, icsFilename } from "./ics";

const BASE_MEETING = {
  id: "abc-123",
  scheduled_at: "2026-05-11T17:00:00.000Z", // 14:00 BRT (UTC-3)
  duration_minutes: 30,
  location: null,
  recurrence: "none",
};
const LEADER = { full_name: "Ana Lima" };
const MEMBER = { full_name: "Bruno Silva" };
const NOW = new Date("2026-05-10T12:00:00.000Z");

function lines(ics: string) {
  return ics.split("\r\n");
}

describe("buildIcs", () => {
  it("produces valid VCALENDAR wrapper", () => {
    const ics = buildIcs(BASE_MEETING, LEADER, MEMBER, "", NOW);
    const ls = lines(ics);
    expect(ls[0]).toBe("BEGIN:VCALENDAR");
    expect(ls[1]).toBe("VERSION:2.0");
    expect(ls[2]).toBe("PRODID:-//OxyPeople//1on1//PT-BR");
    expect(ls.at(-2)).toBe("END:VCALENDAR");
  });

  it("uses CRLF line endings", () => {
    const ics = buildIcs(BASE_MEETING, LEADER, MEMBER, "", NOW);
    expect(ics).toMatch(/\r\n/);
    expect(ics).not.toMatch(/(?<!\r)\n/);
  });

  it("sets UID correctly", () => {
    const ics = buildIcs(BASE_MEETING, LEADER, MEMBER, "", NOW);
    expect(lines(ics)).toContain("UID:abc-123@oxypeople");
  });

  it("uses TZID=America/Sao_Paulo for DTSTART/DTEND", () => {
    const ics = buildIcs(BASE_MEETING, LEADER, MEMBER, "", NOW);
    const ls = lines(ics);
    const dtstart = ls.find((l) => l.startsWith("DTSTART"));
    expect(dtstart).toContain("TZID=America/Sao_Paulo");
    expect(dtstart).toContain("T140000"); // 17:00 UTC = 14:00 BRT
  });

  it("DTEND is DTSTART + duration_minutes", () => {
    const ics = buildIcs(BASE_MEETING, LEADER, MEMBER, "", NOW);
    const ls = lines(ics);
    const dtend = ls.find((l) => l.startsWith("DTEND"));
    expect(dtend).toContain("T143000"); // 14:00 + 30min
  });

  it("includes SUMMARY with leader & member names", () => {
    const ics = buildIcs(BASE_MEETING, LEADER, MEMBER, "", NOW);
    expect(lines(ics).find((l) => l.startsWith("SUMMARY"))).toContain("Ana Lima");
  });

  it("uses 'A definir' when location is null", () => {
    const ics = buildIcs(BASE_MEETING, LEADER, MEMBER, "", NOW);
    expect(lines(ics)).toContain("LOCATION:A definir");
  });

  it("uses provided location", () => {
    const ics = buildIcs({ ...BASE_MEETING, location: "Sala 3" }, LEADER, MEMBER, "", NOW);
    expect(lines(ics)).toContain("LOCATION:Sala 3");
  });

  it("includes detail URL in DESCRIPTION", () => {
    const ics = buildIcs(BASE_MEETING, LEADER, MEMBER, "https://app.oxypeople.com/one-on-ones/abc-123", NOW);
    // URL may be folded across continuation lines — search the full content
    expect(ics.replace(/\r\n /g, "")).toContain("https://app.oxypeople.com/one-on-ones/abc-123");
  });

  describe("recurrence", () => {
    it("none — no RRULE", () => {
      const ics = buildIcs({ ...BASE_MEETING, recurrence: "none" }, LEADER, MEMBER, "", NOW);
      expect(lines(ics).some((l) => l.startsWith("RRULE"))).toBe(false);
    });

    it("weekly — FREQ=WEEKLY with BYDAY", () => {
      const ics = buildIcs({ ...BASE_MEETING, recurrence: "weekly" }, LEADER, MEMBER, "", NOW);
      const rule = lines(ics).find((l) => l.startsWith("RRULE"));
      expect(rule).toContain("FREQ=WEEKLY");
      expect(rule).toContain("BYDAY=");
      expect(rule).not.toContain("INTERVAL");
    });

    it("biweekly — FREQ=WEEKLY;INTERVAL=2 with BYDAY", () => {
      const ics = buildIcs({ ...BASE_MEETING, recurrence: "biweekly" }, LEADER, MEMBER, "", NOW);
      const rule = lines(ics).find((l) => l.startsWith("RRULE"));
      expect(rule).toContain("FREQ=WEEKLY");
      expect(rule).toContain("INTERVAL=2");
      expect(rule).toContain("BYDAY=");
    });

    it("monthly — FREQ=MONTHLY", () => {
      const ics = buildIcs({ ...BASE_MEETING, recurrence: "monthly" }, LEADER, MEMBER, "", NOW);
      const rule = lines(ics).find((l) => l.startsWith("RRULE"));
      expect(rule).toBe("RRULE:FREQ=MONTHLY");
    });
  });

  describe("email fields", () => {
    it("omits ORGANIZER when no email", () => {
      const ics = buildIcs(BASE_MEETING, LEADER, MEMBER, "", NOW);
      expect(lines(ics).some((l) => l.startsWith("ORGANIZER"))).toBe(false);
    });

    it("includes ORGANIZER when leader has email", () => {
      const ics = buildIcs(BASE_MEETING, { ...LEADER, email: "ana@co.com" }, MEMBER, "", NOW);
      expect(lines(ics).some((l) => l.startsWith("ORGANIZER") && l.includes("ana@co.com"))).toBe(true);
    });

    it("includes ATTENDEE when member has email", () => {
      const ics = buildIcs(BASE_MEETING, LEADER, { ...MEMBER, email: "bruno@co.com" }, "", NOW);
      expect(lines(ics).some((l) => l.startsWith("ATTENDEE") && l.includes("bruno@co.com"))).toBe(true);
    });
  });
});

describe("icsEscape", () => {
  it("escapes backslash", () => expect(icsEscape("a\\b")).toBe("a\\\\b"));
  it("escapes comma", () => expect(icsEscape("a,b")).toBe("a\\,b"));
  it("escapes semicolon", () => expect(icsEscape("a;b")).toBe("a\\;b"));
  it("escapes newline", () => expect(icsEscape("a\nb")).toBe("a\\nb"));
  it("escapes multiple chars", () =>
    expect(icsEscape("título; local, novo\nlinha")).toBe("título\\; local\\, novo\\nlinha"));
});

describe("icsFilename", () => {
  it("formats correctly", () => {
    expect(icsFilename(LEADER, MEMBER, "2026-05-11T17:00:00.000Z")).toBe(
      "1on1-ana-lima-bruno-silva-20260511.ics",
    );
  });

  it("strips accents", () => {
    expect(icsFilename({ full_name: "João Müller" }, { full_name: "Érica" }, "2026-01-01T00:00:00Z")).toBe(
      "1on1-joao-muller-erica-20260101.ics",
    );
  });
});
