import { describe, it, expect } from "vitest";
// Lógica pura, vive na edge function porque é lá que roda. Importar daqui
// evita duplicá-la só para testar e quebra o teste se a função mudar de forma.
import {
  buildEvaluationPairs,
  evaluatorsToNotify,
  MAX_PEERS,
  type Participant,
} from "../../../supabase/functions/performance-cycle-start/_lib/participants.ts";

const ana: Participant = { userId: "ana", managerId: "chefe", teamIds: ["t1"] };
const bruno: Participant = { userId: "bruno", managerId: "chefe", teamIds: ["t1"] };
const chefe: Participant = { userId: "chefe", managerId: null, teamIds: ["t1"] };

const rel = (pairs: ReturnType<typeof buildEvaluationPairs>, r: string) =>
  pairs.filter((p) => p.relationship === r);

describe("buildEvaluationPairs", () => {
  it("self gera apenas autoavaliação", () => {
    const p = buildEvaluationPairs([ana, bruno], "self");
    expect(p).toHaveLength(2);
    expect(p.every((x) => x.relationship === "self" && x.evaluatorId === x.evaluatedId)).toBe(true);
  });

  it("pocket gera só a avaliação do gestor", () => {
    const p = buildEvaluationPairs([ana], "pocket");
    expect(p).toEqual([{ evaluatorId: "chefe", evaluatedId: "ana", relationship: "manager" }]);
  });

  // 180 é mão única: a pessoa se avalia e é avaliada pelo gestor, mas não
  // avalia quem a lidera. É isso que o separa do full.
  it("180 combina autoavaliação e gestor, sem avaliar o gestor de volta", () => {
    const p = buildEvaluationPairs([ana], "180");
    expect(rel(p, "self")).toHaveLength(1);
    expect(rel(p, "manager")).toHaveLength(1);
    expect(rel(p, "direct_report")).toHaveLength(0);
    expect(rel(p, "peer")).toHaveLength(0);
  });

  // Full é o ciclo de mão dupla: auto + a pessoa avalia quem a lidera + o
  // gestor avalia cada liderado.
  it("full inclui as três direções", () => {
    const p = buildEvaluationPairs([ana], "full");
    expect(rel(p, "self")).toHaveLength(1);
    expect(rel(p, "manager")).toEqual([
      { evaluatorId: "chefe", evaluatedId: "ana", relationship: "manager" },
    ]);
    expect(rel(p, "direct_report")).toEqual([
      { evaluatorId: "ana", evaluatedId: "chefe", relationship: "direct_report" },
    ]);
    expect(rel(p, "peer")).toHaveLength(0);
  });

  it("full sem gestor cadastrado gera só a autoavaliação", () => {
    const solo = { userId: "solo", managerId: null, teamIds: [] };
    const p = buildEvaluationPairs([solo], "full");
    expect(p).toHaveLength(1);
    expect(p[0].relationship).toBe("self");
  });

  it("leader faz o liderado avaliar quem o lidera", () => {
    const p = buildEvaluationPairs([ana, bruno], "leader");
    expect(p).toHaveLength(2);
    expect(p.every((x) => x.relationship === "direct_report" && x.evaluatedId === "chefe")).toBe(true);
  });

  it("360 cobre auto, gestor, pares e liderados", () => {
    const p = buildEvaluationPairs([ana, bruno, chefe], "360");
    expect(rel(p, "self").length).toBeGreaterThan(0);
    expect(rel(p, "manager").length).toBeGreaterThan(0);
    expect(rel(p, "peer").length).toBeGreaterThan(0);
    expect(rel(p, "direct_report").length).toBeGreaterThan(0);
  });

  it("custom não gera par nenhum — a configuração é manual", () => {
    expect(buildEvaluationPairs([ana, bruno], "custom")).toHaveLength(0);
  });

  // Sem gestor cadastrado não há quem avalie: o par simplesmente não existe,
  // em vez de virar uma avaliação órfã ou apontada para o próprio avaliado.
  it("ignora avaliação de gestor quando a pessoa não tem gestor", () => {
    const semGestor: Participant = { userId: "solo", managerId: null, teamIds: [] };
    const p = buildEvaluationPairs([semGestor], "180");
    expect(rel(p, "manager")).toHaveLength(0);
    expect(rel(p, "self")).toHaveLength(1);
  });

  it("não cria par de alguém consigo mesmo", () => {
    const p = buildEvaluationPairs([ana, bruno, chefe], "360");
    const autoPares = p.filter((x) => x.evaluatorId === x.evaluatedId && x.relationship !== "self");
    expect(autoPares).toHaveLength(0);
  });

  it("não duplica pares", () => {
    const p = buildEvaluationPairs([ana, bruno, chefe], "360");
    const chaves = p.map((x) => `${x.evaluatorId}|${x.evaluatedId}|${x.relationship}`);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("limita a quantidade de pares por pessoa", () => {
    const time = Array.from({ length: 10 }, (_, i) => ({
      userId: `p${i}`, managerId: null, teamIds: ["t1"],
    }));
    const p = buildEvaluationPairs(time, "360");
    for (const pessoa of time) {
      const meus = p.filter((x) => x.evaluatorId === pessoa.userId && x.relationship === "peer");
      expect(meus.length).toBeLessThanOrEqual(MAX_PEERS);
    }
  });

  it("só forma par com quem divide time", () => {
    const isolado: Participant = { userId: "isolado", managerId: null, teamIds: ["t9"] };
    const p = buildEvaluationPairs([ana, bruno, isolado], "360");
    const paresDoIsolado = p.filter((x) => x.evaluatorId === "isolado" && x.relationship === "peer");
    expect(paresDoIsolado).toHaveLength(0);
  });

  it("é estável entre execuções", () => {
    const time = Array.from({ length: 8 }, (_, i) => ({
      userId: `p${i}`, managerId: null, teamIds: ["t1"],
    }));
    expect(buildEvaluationPairs(time, "360")).toEqual(buildEvaluationPairs(time, "360"));
  });
});

describe("evaluatorsToNotify", () => {
  it("lista cada avaliador uma vez", () => {
    const p = buildEvaluationPairs([ana, bruno], "180");
    const quem = evaluatorsToNotify(p);
    expect(quem).toEqual([...new Set(quem)]);
    expect(quem).toContain("chefe");
    expect(quem).toContain("ana");
  });

  it("devolve lista vazia sem pares", () => {
    expect(evaluatorsToNotify([])).toEqual([]);
  });
});
