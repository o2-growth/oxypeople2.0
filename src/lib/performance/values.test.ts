import { describe, it, expect } from "vitest";
import {
  O2_VALUES, O2_VALUES_LEGACY, SCALE,
  overallScore, answeredCount, isComplete, scaleLabel,
} from "./values";

const todas = (nota: number) =>
  Object.fromEntries(O2_VALUES.map((v) => [v.key, nota]));

describe("valores e escala", () => {
  it("tem cinco valores, sem chave repetida", () => {
    expect(O2_VALUES).toHaveLength(5);
    expect(new Set(O2_VALUES.map((v) => v.key)).size).toBe(5);
  });

  it("mantém a geração anterior para ler o histórico do Feedz", () => {
    expect(O2_VALUES_LEGACY).toHaveLength(5);
    // as chaves não podem colidir com as atuais, senão o histórico se mistura
    const atuais = new Set(O2_VALUES.map((v) => v.key));
    expect(O2_VALUES_LEGACY.every((v) => !atuais.has(v.key))).toBe(true);
  });

  it("usa escala de 1 a 5", () => {
    expect(SCALE.map((s) => s.value)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("overallScore", () => {
  it("calcula a média das notas", () => {
    expect(overallScore(todas(5))).toBe(5);
    expect(overallScore(todas(3))).toBe(3);
  });

  it("arredonda em duas casas", () => {
    const a = { ...todas(4), [O2_VALUES[0].key]: 5 };
    expect(overallScore(a)).toBe(4.2);
  });

  // Média parcial exibida como nota final enganaria: 5 num único valor
  // respondido não é "nota 5".
  it("devolve null enquanto faltar resposta", () => {
    const parcial = { ...todas(5) };
    delete parcial[O2_VALUES[0].key];
    expect(overallScore(parcial)).toBeNull();
    expect(overallScore({})).toBeNull();
  });

  it("ignora chave que não é valor da empresa", () => {
    expect(overallScore({ ...todas(4), lixo: 1 })).toBe(4);
  });
});

describe("answeredCount / isComplete", () => {
  it("conta quantos valores têm nota", () => {
    expect(answeredCount({})).toBe(0);
    expect(answeredCount({ [O2_VALUES[0].key]: 3 })).toBe(1);
    expect(answeredCount(todas(3))).toBe(5);
  });

  it("só é completo com todos respondidos", () => {
    expect(isComplete(todas(1))).toBe(true);
    expect(isComplete({ [O2_VALUES[0].key]: 5 })).toBe(false);
  });

  it("não conta valor indefinido como respondido", () => {
    expect(answeredCount({ [O2_VALUES[0].key]: undefined })).toBe(0);
  });
});

describe("scaleLabel", () => {
  it("traduz a nota inteira", () => {
    expect(scaleLabel(1)).toBe("Muito abaixo");
    expect(scaleLabel(3)).toBe("Atende");
    expect(scaleLabel(5)).toBe("Referência");
  });

  it("arredonda média fracionária para o degrau mais próximo", () => {
    expect(scaleLabel(4.2)).toBe("Acima");
    expect(scaleLabel(4.6)).toBe("Referência");
  });

  it("devolve null sem nota", () => {
    expect(scaleLabel(null)).toBeNull();
    expect(scaleLabel(undefined)).toBeNull();
  });

  it("prende nos limites da escala", () => {
    expect(scaleLabel(0)).toBe("Muito abaixo");
    expect(scaleLabel(9)).toBe("Referência");
  });
});
