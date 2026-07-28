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

  it("binary: 100 só quando atinge a meta", () => {
    expect(krProgress({ kr_type: "binary", current_value: 0, target_value: 1 })).toBe(0);
    expect(krProgress({ kr_type: "binary", current_value: 1, target_value: 1 })).toBe(100);
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

  it("binário no preview: só 100 ao atingir a meta", () => {
    const bin = { initial_value: 0, target_value: 1, kr_type: "binary" as const };
    expect(krProgressForValue(0, bin)).toBe(0);
    expect(krProgressForValue(1, bin)).toBe(100);
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
