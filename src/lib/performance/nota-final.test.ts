import { describe, it, expect } from "vitest";
import { calcularNotaFinal, podePublicar, resumoDaOrigem, type LinhaCalibragem } from "./nota-final";
import { ATTITUDES } from "./attitudes";

const linha = (over: Partial<LinhaCalibragem> = {}): LinhaCalibragem => ({
  questionId: crypto.randomUUID(),
  selfScore: 2,
  leaderScore: 3,
  calibrado: null,
  ...over,
});

const doze = (fn: (i: number) => Partial<LinhaCalibragem> = () => ({})) =>
  Array.from({ length: ATTITUDES.length }, (_, i) => linha(fn(i)));

describe("nota final da calibragem", () => {
  it("usa a nota calibrada quando o comitê decidiu", () => {
    const n = calcularNotaFinal(doze(() => ({ calibrado: 3, selfScore: 1, leaderScore: 1 })));
    expect(n.score).toBe(3);
    expect(n.calibradas).toBe(12);
    expect(n.herdadas).toBe(0);
  });

  it("herda o consenso auto/líder onde não houve calibragem", () => {
    // 2 e 3 → consenso 2,5 em todas.
    const n = calcularNotaFinal(doze());
    expect(n.score).toBe(2.5);
    expect(n.herdadas).toBe(12);
  });

  it("mistura calibrado e herdado na mesma média", () => {
    const linhas = doze((i) => (i < 6 ? { calibrado: 3 } : {}));
    const n = calcularNotaFinal(linhas);
    // 6 atitudes a 3 e 6 a 2,5.
    expect(n.score).toBe(2.75);
    expect(n.calibradas).toBe(6);
    expect(n.herdadas).toBe(6);
  });

  it("atitude sem autoavaliação nem líder fica sem base e não entra na média", () => {
    const linhas = doze((i) => (i === 0 ? { selfScore: null, leaderScore: null } : {}));
    const n = calcularNotaFinal(linhas);
    expect(n.semBase).toBe(1);
    expect(n.score).toBe(2.5); // as 11 restantes
  });

  it("só uma das duas notas não vira consenso — nota de um lado não é acordo", () => {
    const n = calcularNotaFinal([linha({ selfScore: 3, leaderScore: null })]);
    expect(n.semBase).toBe(1);
    expect(n.detalhe[0].origem).toBe("sem base");
  });

  it("guarda a conta linha a linha para auditoria", () => {
    const linhas = doze((i) => (i === 0 ? { calibrado: 1 } : {}));
    const n = calcularNotaFinal(linhas);
    expect(n.detalhe).toHaveLength(12);
    expect(n.detalhe[0]).toMatchObject({ valor: 1, origem: "calibrado" });
    expect(n.detalhe[1]).toMatchObject({ valor: 2.5, origem: "consenso" });
  });

  it("arredonda para duas casas, como o resto do sistema", () => {
    const linhas = doze((i) => ({ calibrado: i < 5 ? 3 : 2 }));
    expect(calcularNotaFinal(linhas).score).toBe(2.42);
  });
});

describe("podePublicar", () => {
  it("libera quando as 12 atitudes têm base", () => {
    expect(podePublicar(calcularNotaFinal(doze()))).toEqual({ ok: true, motivo: null });
  });

  it("barra quando alguma atitude não tem base nenhuma", () => {
    const n = calcularNotaFinal(doze((i) => (i === 0 ? { selfScore: null, leaderScore: null } : {})));
    const r = podePublicar(n);
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/sem autoavaliação/);
  });

  it("barra avaliação incompleta — menos atitudes do que o ciclo prevê", () => {
    const r = podePublicar(calcularNotaFinal(doze().slice(0, 8)));
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/8 de 12/);
  });

  it("não exige calibragem: consenso das duas partes basta para publicar", () => {
    // Publicar sem o comitê ter tocado é decisão de quem publica, não um erro.
    expect(podePublicar(calcularNotaFinal(doze())).ok).toBe(true);
  });
});

describe("resumoDaOrigem", () => {
  it("diz o quanto a nota foi discutida", () => {
    expect(resumoDaOrigem(calcularNotaFinal(doze(() => ({ calibrado: 3 }))))).toBe("toda calibrada");
    expect(resumoDaOrigem(calcularNotaFinal(doze()))).toBe("sem calibragem");
    expect(resumoDaOrigem(calcularNotaFinal(doze((i) => (i < 4 ? { calibrado: 3 } : {}))))).toBe("4 de 12 calibradas");
  });
});
