import { describe, expect, it } from "vitest";
import {
  calcularControle,
  ordenarPorUrgencia,
  type RegistroLite,
} from "./controleDeDias";

const HOJE = new Date("2026-09-03T12:00:00Z");

function reg(
  start: string,
  end: string,
  days: number,
  status = "realizada",
): RegistroLite {
  return { start_date: start, end_date: end, days, status };
}

describe("calcularControle", () => {
  it("soma só os afastamentos que já aconteceram", () => {
    const r = calcularControle(
      [
        reg("2026-08-01", "2026-08-10", 10),
        reg("2026-07-01", "2026-07-05", 5, "arquivada"),
        reg("2026-10-01", "2026-10-05", 5, "agendada"),
        reg("2026-06-01", "2026-06-03", 3, "cancelada"),
      ],
      365,
      HOJE,
    );
    expect(r.diasNaJanela).toBe(15);
    expect(r.diasNoTotal).toBe(15);
  });

  it("conta afastamento em andamento como já ocorrido", () => {
    const r = calcularControle(
      [reg("2026-08-30", "2026-09-08", 10, "em_andamento")],
      365,
      HOJE,
    );
    expect(r.diasNaJanela).toBe(10);
  });

  it("recorta pela janela usando o início do afastamento", () => {
    const r = calcularControle(
      [
        reg("2026-08-01", "2026-08-10", 10),
        reg("2024-01-01", "2024-01-10", 10),
      ],
      365,
      HOJE,
    );
    expect(r.diasNaJanela).toBe(10);
    expect(r.diasNoTotal).toBe(20);
    expect(r.registrosNaJanela).toBe(1);
  });

  it("mede dias desde o último afastamento", () => {
    const r = calcularControle([reg("2026-08-01", "2026-08-24", 24)], 365, HOJE);
    expect(r.ultimoAfastamento).toBe("2026-08-24");
    expect(r.diasSemAfastar).toBe(10);
  });

  it("não devolve dias negativos para quem está afastado agora", () => {
    const r = calcularControle(
      [reg("2026-08-30", "2026-09-08", 10, "em_andamento")],
      365,
      HOJE,
    );
    expect(r.diasSemAfastar).toBe(0);
  });

  it("quem nunca se afastou fica com null, não com zero", () => {
    const r = calcularControle([], 365, HOJE);
    expect(r.ultimoAfastamento).toBeNull();
    expect(r.diasSemAfastar).toBeNull();
    expect(r.diasNaJanela).toBe(0);
  });

  it("aponta a próxima ausência agendada", () => {
    const r = calcularControle(
      [
        reg("2026-11-08", "2026-11-15", 8, "agendada"),
        reg("2026-09-20", "2026-09-25", 6, "agendada"),
      ],
      365,
      HOJE,
    );
    expect(r.proximoAgendado).toBe("2026-09-20");
  });
});

describe("ordenarPorUrgencia", () => {
  const linha = (nome: string, diasSemAfastar: number | null) => ({
    nome,
    controle: {
      diasNaJanela: 0,
      diasNoTotal: 0,
      ultimoAfastamento: diasSemAfastar === null ? null : "2026-01-01",
      diasSemAfastar,
      proximoAgendado: null,
      registrosNaJanela: 0,
    },
  });

  it("põe quem nunca se afastou no topo", () => {
    const ordem = ordenarPorUrgencia([
      linha("Ana", 30),
      linha("Bruno", null),
      linha("Carla", 200),
    ]).map((l) => l.nome);
    expect(ordem).toEqual(["Bruno", "Carla", "Ana"]);
  });

  it("desempata por nome", () => {
    const ordem = ordenarPorUrgencia([
      linha("Zeca", 50),
      linha("Ana", 50),
    ]).map((l) => l.nome);
    expect(ordem).toEqual(["Ana", "Zeca"]);
  });

  it("ordena quem nunca se afastou entre si por nome", () => {
    const ordem = ordenarPorUrgencia([
      linha("Zeca", null),
      linha("Ana", null),
    ]).map((l) => l.nome);
    expect(ordem).toEqual(["Ana", "Zeca"]);
  });
});
