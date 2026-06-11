import { describe, it, expect } from "vitest";
import {
  calcDays,
  lastTakenEnd,
  nextScheduledStart,
  computeAlert,
  type AlertSettings,
  type TimeOffLite,
} from "./alerts";

const NOW = new Date("2026-06-10T12:00:00Z");

describe("calcDays", () => {
  it("conta inclusivo: mesmo dia = 1", () => {
    expect(calcDays("2025-10-10", "2025-10-10")).toBe(1);
  });
  it("conta período de 3 dias", () => {
    expect(calcDays("2025-10-01", "2025-10-03")).toBe(3);
  });
  it("retorna 0 se fim antes do início", () => {
    expect(calcDays("2025-10-05", "2025-10-01")).toBe(0);
  });
});

describe("lastTakenEnd", () => {
  it("pega o maior end_date entre ausências passadas", () => {
    const recs: TimeOffLite[] = [
      { start_date: "2025-01-01", end_date: "2025-01-05", status: "realizada" },
      { start_date: "2025-08-01", end_date: "2025-08-10", status: "arquivada" },
      { start_date: "2026-12-01", end_date: "2026-12-05", status: "agendada" }, // futura, ignora
    ];
    expect(lastTakenEnd(recs)).toBe("2025-08-10");
  });
  it("retorna null se não houver ausência tirada", () => {
    expect(lastTakenEnd([{ start_date: "2026-12-01", end_date: "2026-12-05", status: "agendada" }])).toBeNull();
  });
});

describe("nextScheduledStart", () => {
  it("pega a próxima agendada futura", () => {
    const recs: TimeOffLite[] = [
      { start_date: "2026-07-01", end_date: "2026-07-05", status: "agendada" },
      { start_date: "2026-09-01", end_date: "2026-09-05", status: "agendada" },
      { start_date: "2025-01-01", end_date: "2025-01-05", status: "agendada" }, // passada
    ];
    expect(nextScheduledStart(recs, NOW)).toBe("2026-07-01");
  });
});

describe("computeAlert — since_hire", () => {
  const settings: AlertSettings = { alert_mode: "since_hire", overdue_months: 12, soon_months: 10 };
  it("overdue quando passou >= overdue_months desde a admissão", () => {
    const r = computeAlert({ hire_date: "2025-01-01" }, [], settings, NOW); // ~17 meses
    expect(r.level).toBe("overdue");
  });
  it("soon entre soon e overdue", () => {
    const r = computeAlert({ hire_date: "2025-08-01" }, [], settings, NOW); // ~10 meses
    expect(r.level).toBe("soon");
  });
  it("ok quando recém-admitido", () => {
    const r = computeAlert({ hire_date: "2026-03-01" }, [], settings, NOW); // ~3 meses
    expect(r.level).toBe("ok");
  });
  it("ok seguro quando sem admissão", () => {
    expect(computeAlert({ hire_date: null }, [], settings, NOW).level).toBe("ok");
  });
});

describe("computeAlert — since_last", () => {
  const settings: AlertSettings = { alert_mode: "since_last", overdue_months: 12, soon_months: 10 };
  it("usa a última ausência como referência (em dia se tirou há pouco)", () => {
    const recs: TimeOffLite[] = [{ start_date: "2026-04-01", end_date: "2026-04-10", status: "realizada" }];
    expect(computeAlert({ hire_date: "2020-01-01" }, recs, settings, NOW).level).toBe("ok");
  });
  it("cai pra admissão quando nunca tirou → overdue", () => {
    expect(computeAlert({ hire_date: "2024-01-01" }, [], settings, NOW).level).toBe("overdue");
  });
});

describe("computeAlert — scheduled", () => {
  const settings: AlertSettings = { alert_mode: "scheduled", overdue_months: 12, soon_months: 3 };
  it("soon quando há agendada dentro da janela", () => {
    const recs: TimeOffLite[] = [{ start_date: "2026-07-15", end_date: "2026-07-20", status: "agendada" }];
    expect(computeAlert({ hire_date: "2020-01-01" }, recs, settings, NOW).level).toBe("soon");
  });
  it("overdue quando não há nenhuma agendada", () => {
    expect(computeAlert({ hire_date: "2020-01-01" }, [], settings, NOW).level).toBe("overdue");
  });
});
