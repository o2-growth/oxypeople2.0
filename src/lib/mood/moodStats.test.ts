import { describe, it, expect } from "vitest";
import {
  summarize, monthlySeries, byDepartment, distribution, byPerson, moodStep,
  type MoodEntry,
} from "./moodStats";

function entry(over: Partial<MoodEntry> = {}): MoodEntry {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: "u1",
    person_name: "Fulano",
    score: 5,
    mood_label: "5",
    description: null,
    department: "Operação",
    recorded_at: "2026-07-30T12:00:00Z",
    ...over,
  };
}

describe("moodStep", () => {
  it("mapeia a nota para o degrau da escala", () => {
    expect(moodStep(5)?.label).toBe("Ótimo");
    expect(moodStep(1)?.label).toBe("Muito ruim");
    expect(moodStep(3)?.label).toBe("Neutro");
  });

  it("arredonda nota fracionária", () => {
    expect(moodStep(4.9)?.label).toBe("Ótimo");
    expect(moodStep(4.4)?.label).toBe("Bom");
  });

  it("prende nos limites em vez de devolver indefinido", () => {
    expect(moodStep(0)?.label).toBe("Muito ruim");
    expect(moodStep(9)?.label).toBe("Ótimo");
  });

  it("devolve null para ausência de nota", () => {
    expect(moodStep(null)).toBeNull();
    expect(moodStep(undefined)).toBeNull();
    expect(moodStep(NaN)).toBeNull();
  });
});

describe("summarize", () => {
  it("conta registros, pessoas distintas e período", () => {
    const r = summarize([
      entry({ user_id: "a", recorded_at: "2026-05-04T10:00:00Z", mood_label: "4" }),
      entry({ user_id: "b", recorded_at: "2026-07-30T10:00:00Z", mood_label: "5" }),
      entry({ user_id: "a", recorded_at: "2026-06-15T10:00:00Z", mood_label: "5" }),
    ]);
    expect(r.total).toBe(3);
    expect(r.pessoas).toBe(2);
    expect(r.periodoInicio).toBe("2026-05-04");
    expect(r.periodoFim).toBe("2026-07-30");
    expect(r.mediaGeral).toBeCloseTo(4.67, 1);
  });

  it("não quebra com lista vazia", () => {
    const r = summarize([]);
    expect(r).toMatchObject({ total: 0, pessoas: 0, mediaGeral: null, periodoInicio: null });
  });

  // mood_label é o humor daquele dia; score é a média histórica da pessoa.
  // Confundir os dois achataria a série toda na média.
  it("prefere o humor do dia à média histórica", () => {
    const r = summarize([entry({ mood_label: "3", score: 5 })]);
    expect(r.mediaGeral).toBe(3);
  });

  it("cai para a média quando não há humor do dia", () => {
    const r = summarize([entry({ mood_label: null, score: 4.2 })]);
    expect(r.mediaGeral).toBe(4.2);
  });
});

describe("monthlySeries", () => {
  it("agrupa por mês em ordem cronológica", () => {
    const s = monthlySeries([
      entry({ recorded_at: "2026-07-10T10:00:00Z", mood_label: "5" }),
      entry({ recorded_at: "2026-05-04T10:00:00Z", mood_label: "4" }),
      entry({ recorded_at: "2026-07-20T10:00:00Z", mood_label: "3" }),
    ]);
    expect(s.map((p) => p.periodo)).toEqual(["2026-05", "2026-07"]);
    expect(s[1]).toMatchObject({ media: 4, registros: 2 });
  });
});

describe("byDepartment", () => {
  it("ordena da menor média para a maior", () => {
    const d = byDepartment([
      entry({ department: "Comercial", mood_label: "5", user_id: "a" }),
      entry({ department: "Operação", mood_label: "2", user_id: "b" }),
      entry({ department: "Operação", mood_label: "4", user_id: "c" }),
    ]);
    expect(d[0]).toMatchObject({ departamento: "Operação", media: 3, pessoas: 2 });
    expect(d[1].departamento).toBe("Comercial");
  });

  it("agrupa departamento ausente num rótulo próprio", () => {
    const d = byDepartment([entry({ department: null }), entry({ department: "  " })]);
    expect(d).toHaveLength(1);
    expect(d[0].departamento).toBe("Sem departamento");
  });
});

describe("distribution", () => {
  it("devolve os cinco degraus mesmo sem registro em alguns", () => {
    const d = distribution([entry({ mood_label: "5" }), entry({ mood_label: "5" })]);
    expect(d).toHaveLength(5);
    expect(d.find((x) => x.nota === 5)).toMatchObject({ quantidade: 2, percentual: 100 });
    expect(d.find((x) => x.nota === 1)).toMatchObject({ quantidade: 0, percentual: 0 });
  });

  it("não divide por zero com lista vazia", () => {
    expect(distribution([]).every((d) => d.percentual === 0)).toBe(true);
  });
});

describe("byPerson", () => {
  it("agrega por pessoa e destaca a menor média primeiro", () => {
    const p = byPerson([
      entry({ user_id: "a", person_name: "Ana", mood_label: "5" }),
      entry({ user_id: "b", person_name: "Bruno", mood_label: "2", recorded_at: "2026-06-01T10:00:00Z" }),
      entry({ user_id: "b", person_name: "Bruno", mood_label: "4", recorded_at: "2026-07-01T10:00:00Z" }),
    ]);
    expect(p[0]).toMatchObject({ nome: "Bruno", media: 3, registros: 2, ultimaNota: 4 });
    expect(p[0].ultimoRegistro).toBe("2026-07-01T10:00:00Z");
    expect(p[1].nome).toBe("Ana");
  });

  // Quem já saiu da empresa entra sem user_id; o nome é o que sobra para agrupar.
  it("agrupa por nome quando não há user vinculado", () => {
    const p = byPerson([
      entry({ user_id: null, person_name: "Ex-colaborador", mood_label: "3" }),
      entry({ user_id: null, person_name: "Ex-colaborador", mood_label: "5" }),
    ]);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ media: 4, registros: 2, userId: null });
  });
});
