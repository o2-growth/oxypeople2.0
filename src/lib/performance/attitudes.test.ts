import { describe, it, expect } from "vitest";
import {
  ATTITUDES, ATTITUDE_SCALE, MIN_COMMENT_LENGTH,
  isAttitudeComplete, completedCount, isComplete, overallScore, attitudeLabel, firstIncomplete,
  type AttitudeAnswers,
} from "./attitudes";

// "ok" tem 2 caracteres e seria rejeitado pelo mínimo — o padrão precisa ser
// um comentário válido, senão nenhuma resposta do teste conta como completa.
const resposta = (score: number, comment = "justificativa") => ({ score, comment });
const todas = (score: number): AttitudeAnswers =>
  Object.fromEntries(ATTITUDES.map((a) => [a.key, resposta(score)]));

describe("catálogo de atitudes", () => {
  it("tem as 12 atitudes inegociáveis", () => {
    expect(ATTITUDES).toHaveLength(12);
  });

  it("não repete chave nem rótulo", () => {
    expect(new Set(ATTITUDES.map((a) => a.key)).size).toBe(12);
    expect(new Set(ATTITUDES.map((a) => a.label)).size).toBe(12);
  });

  // Os três textos são o que a pessoa lê para decidir a nota: sem eles a
  // escala vira um número sem critério.
  it("descreve os três níveis em todas", () => {
    for (const a of ATTITUDES) {
      expect(a.limited.length).toBeGreaterThan(20);
      expect(a.meets.length).toBeGreaterThan(20);
      expect(a.reference.length).toBeGreaterThan(20);
    }
  });

  it("usa escala de 1 a 3", () => {
    expect(ATTITUDE_SCALE.map((s) => s.value)).toEqual([1, 2, 3]);
    expect(ATTITUDE_SCALE[0].label).toBe("Entrega Limitada");
    expect(ATTITUDE_SCALE[2].label).toBe("Entrega e é Referência");
  });
});

describe("isAttitudeComplete", () => {
  it("exige nota e comentário", () => {
    expect(isAttitudeComplete({ score: 2, comment: "bom" })).toBe(true);
    expect(isAttitudeComplete({ score: 2 })).toBe(false);
    expect(isAttitudeComplete({ comment: "bom" })).toBe(false);
    expect(isAttitudeComplete(undefined)).toBe(false);
  });

  it("recusa comentário curto demais", () => {
    expect(isAttitudeComplete({ score: 2, comment: "ok" })).toBe(false);
    expect(isAttitudeComplete({ score: 2, comment: "oka" })).toBe(true);
  });

  it("não aceita espaço em branco como comentário", () => {
    expect(isAttitudeComplete({ score: 3, comment: "    " })).toBe(false);
  });

  it("recusa nota fora da escala", () => {
    expect(isAttitudeComplete({ score: 0, comment: "abc" })).toBe(false);
    expect(isAttitudeComplete({ score: 4, comment: "abc" })).toBe(false);
  });

  it("o mínimo de comentário é o mesmo da avaliação anterior", () => {
    expect(MIN_COMMENT_LENGTH).toBe(3);
  });
});

describe("progresso", () => {
  it("conta só as atitudes completas", () => {
    const a: AttitudeAnswers = {
      [ATTITUDES[0].key]: resposta(3),
      [ATTITUDES[1].key]: { score: 2 },          // sem comentário
      [ATTITUDES[2].key]: { comment: "abc" },    // sem nota
    };
    expect(completedCount(a)).toBe(1);
    expect(isComplete(a)).toBe(false);
  });

  it("fica completo com as 12 respondidas", () => {
    expect(isComplete(todas(2))).toBe(true);
    expect(completedCount(todas(2))).toBe(12);
  });

  it("aponta a primeira que falta, na ordem do formulário", () => {
    const a = todas(2);
    delete a[ATTITUDES[4].key];
    expect(firstIncomplete(a)?.key).toBe(ATTITUDES[4].key);
  });

  it("não aponta nenhuma quando está tudo pronto", () => {
    expect(firstIncomplete(todas(3))).toBeNull();
  });
});

describe("overallScore", () => {
  it("calcula a média na escala de 1 a 3", () => {
    expect(overallScore(todas(3))).toBe(3);
    expect(overallScore(todas(1))).toBe(1);
  });

  it("arredonda em duas casas", () => {
    const a = todas(2);
    a[ATTITUDES[0].key] = resposta(3);
    expect(overallScore(a)).toBe(2.08);
  });

  it("devolve null enquanto faltar nota", () => {
    const a = todas(2);
    delete a[ATTITUDES[0].key];
    expect(overallScore(a)).toBeNull();
    expect(overallScore({})).toBeNull();
  });

  // A nota depende só das notas: comentário faltando trava o envio, mas não
  // deve alterar a média de quem já pontuou tudo.
  it("ignora comentário no cálculo", () => {
    const a = todas(2);
    a[ATTITUDES[0].key] = { score: 2 };
    expect(overallScore(a)).toBe(2);
  });
});

describe("attitudeLabel", () => {
  it("traduz a nota", () => {
    expect(attitudeLabel(1)).toBe("Entrega Limitada");
    expect(attitudeLabel(2)).toBe("Entrega");
    expect(attitudeLabel(3)).toBe("Entrega e é Referência");
  });

  it("arredonda média fracionária", () => {
    expect(attitudeLabel(2.4)).toBe("Entrega");
    expect(attitudeLabel(2.6)).toBe("Entrega e é Referência");
  });

  it("prende nos limites e trata ausência", () => {
    expect(attitudeLabel(0)).toBe("Entrega Limitada");
    expect(attitudeLabel(9)).toBe("Entrega e é Referência");
    expect(attitudeLabel(null)).toBeNull();
  });
});
