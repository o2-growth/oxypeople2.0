import { describe, it, expect } from "vitest";
import { krProgress, krProgressForValue, formatKrValue } from "./kr-progress";

describe("krProgress (valor atual)", () => {
  it("up: proporcional entre initial e target", () => {
    expect(krProgress({ initial_value: 0, current_value: 50, target_value: 100 })).toBe(50);
    expect(krProgress({ initial_value: 20, current_value: 60, target_value: 100 })).toBe(50);
  });

  it("clampa entre 0 e 100", () => {
    expect(krProgress({ initial_value: 0, current_value: -10, target_value: 100 })).toBe(0);
    expect(krProgress({ initial_value: 0, current_value: 200, target_value: 100 })).toBe(100);
  });

  it("down: progride quando o valor cai em direção à meta", () => {
    expect(krProgress({ direction: "down", initial_value: 100, current_value: 50, target_value: 0 })).toBe(50);
  });

  it("binary: crédito parcial proporcional, 100 ao atingir a meta", () => {
    expect(krProgress({ kr_type: "binary", current_value: 0, target_value: 1 })).toBe(0);
    expect(krProgress({ kr_type: "binary", current_value: 0.4, target_value: 1 })).toBe(40);
    expect(krProgress({ kr_type: "binary", current_value: 1, target_value: 1 })).toBe(100);
    // meta 0 degenerada não divide por zero
    expect(krProgress({ kr_type: "binary", current_value: 0, target_value: 0 })).toBe(100);
  });

  it("span zero: 100 se já atingiu, senão 0", () => {
    expect(krProgress({ initial_value: 100, current_value: 100, target_value: 100 })).toBe(100);
    expect(krProgress({ initial_value: 100, current_value: 50, target_value: 100 })).toBe(0);
  });

  it("aceita valores em string (vindos do backend)", () => {
    expect(krProgress({ initial_value: "0", current_value: "25", target_value: "100" })).toBe(25);
  });
});

describe("krProgressForValue (preview ao vivo antes→depois)", () => {
  const kr = { initial_value: 0, target_value: 1166, kr_type: "numeric" as const };

  it("computa o progresso para um valor candidato sem depender do atual", () => {
    expect(krProgressForValue(0, kr)).toBe(0);
    expect(krProgressForValue(583, kr)).toBe(50);
    expect(krProgressForValue(1166, kr)).toBe(100);
  });

  it("respeita direction down no preview", () => {
    const down = { initial_value: 100, target_value: 0, direction: "down" as const };
    expect(krProgressForValue(75, down)).toBe(25);
    expect(krProgressForValue(0, down)).toBe(100);
  });

  it("binário no preview: avanço parcial conta, 100 ao atingir a meta", () => {
    const bin = { initial_value: 0, target_value: 1, kr_type: "binary" as const };
    expect(krProgressForValue(0, bin)).toBe(0);
    expect(krProgressForValue(0.65, bin)).toBe(65);
    expect(krProgressForValue(1, bin)).toBe(100);
  });
});

describe("consistência entre visões — MESMA função em todo lugar", () => {
  // Cada visão (MyOkrsView, OkrOverview/CTO, board via KeyResultItem, export,
  // ProgressChart) e o preview do CheckinDialog computam o % do MESMO estado do
  // KR pela lib canônica. Estes casos travam a não-divergência entre elas.
  const cases = [
    { name: "up/numeric", kr: { kr_type: "numeric", direction: "up", initial_value: 0, target_value: 1166 }, value: 350 },
    { name: "down", kr: { kr_type: "numeric", direction: "down", initial_value: 100, target_value: 20 }, value: 60 },
    { name: "percent", kr: { kr_type: "percent", direction: "up", initial_value: 0, target_value: 100 }, value: 42 },
    { name: "currency", kr: { kr_type: "currency", direction: "up", initial_value: 1000, target_value: 5000 }, value: 3000 },
    { name: "binary", kr: { kr_type: "binary", direction: "up", initial_value: 0, target_value: 1 }, value: 1 },
  ];

  it.each(cases)(
    "preview do CheckinDialog === % canônico exibido nos mapas, mesmo estado ($name)",
    ({ kr, value }) => {
      // Preview do diálogo para o valor:
      const preview = krProgressForValue(value, kr);
      // Headline que MyOkrsView/OkrOverview/board/export mostram para o KR:
      const mapa = krProgress({ ...kr, current_value: value });
      expect(preview).toBe(mapa);
    },
  );

  it("o afterPct do preview é EXATAMENTE o % que o mapa mostrará após o check-in", () => {
    const kr = { kr_type: "numeric", direction: "up", initial_value: 0, target_value: 200 };
    const before = krProgressForValue(50, kr); // 25
    const after = krProgressForValue(100, kr); // 50
    expect(after - before).toBe(25);
    // pós-check-in (current_value := novo valor), o mapa canônico bate com o preview
    expect(krProgress({ ...kr, current_value: 50 })).toBe(before);
    expect(krProgress({ ...kr, current_value: 100 })).toBe(after);
  });
});

describe("formatKrValue", () => {
  it("currency: prefixo R$ em pt-BR", () => {
    expect(formatKrValue(1166, "currency")).toBe("R$ 1.166");
  });

  it("percent: sufixo %", () => {
    expect(formatKrValue(30, "percent")).toBe("30%");
  });

  it("numeric: mostra a unidade quando houver", () => {
    expect(formatKrValue(1166, "numeric", "leads")).toBe("1.166 leads");
    expect(formatKrValue(1166, "numeric")).toBe("1.166");
  });
});
