import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { propostaParaFormulario, camposParaConferir, type OkrDraft } from "./draft-contract";
import { krMode, krProgress } from "@/lib/kr-progress";

const kr = (over: Partial<OkrDraft["key_results"][number]> = {}) => ({
  title: "CPMQL Modelo atual < R$ 500",
  kr_type: "currency" as const,
  direction: "down" as const,
  initial_value: 0,
  target_value: 500,
  unit: "R$",
  weight_percentage: 0,
  owner_nome: null,
  origem_do_numero: "citado" as const,
  confianca: "alta" as const,
  racional: "O líder disse o número.",
  ...over,
});

const draft = (over: Partial<OkrDraft> = {}): OkrDraft => ({
  objetivo: {
    title: "Baixar o custo de aquisição sem perder volume",
    description: "…",
    type: "operational",
    commitment_type: "committed",
    parent_titulo: null,
  },
  key_results: [kr()],
  perguntas: [],
  avisos: [],
  ...over,
});

const semResolver = { objetivoPorTitulo: () => undefined };

describe("proposta → formulário", () => {
  it("leva a direção para o formulário — era o campo que o diálogo descartava", () => {
    const form = propostaParaFormulario(draft(), semResolver);
    expect(form.keyResults[0].direction).toBe("down");
    expect(form.keyResults[0].krType).toBe("currency");
    expect(form.keyResults[0].unit).toBe("R$");
  });

  it("KR proposto entra no formulário como teto e vale 100% dentro do limite", () => {
    // O ciclo fecha: o que o copiloto propõe é lido pela mesma lib que desenha
    // a barra. Um teto proposto errado apareceria como fração aqui.
    const form = propostaParaFormulario(draft(), semResolver);
    const salvo = {
      kr_type: form.keyResults[0].krType,
      direction: form.keyResults[0].direction,
      initial_value: form.keyResults[0].initialValue,
      target_value: form.keyResults[0].targetValue,
      current_value: 420,
      last_checkin_at: "2026-09-08",
    };
    expect(krMode(salvo)).toBe("ceiling");
    expect(krProgress(salvo)).toBe(100);
  });

  it("valor atual começa em zero: proposta não inventa medição", () => {
    expect(propostaParaFormulario(draft(), semResolver).keyResults[0].currentValue).toBe(0);
  });

  it("resolve o objetivo-pai pelo título, ignorando caixa e espaço", () => {
    const form = propostaParaFormulario(
      draft({ objetivo: { ...draft().objetivo, parent_titulo: "  okr marketing — q3/2026 " } }),
      { objetivoPorTitulo: (t) => (t.trim().toLowerCase() === "okr marketing — q3/2026" ? "id-pai" : undefined) },
    );
    expect(form.parentId).toBe("id-pai");
  });

  it("pai que não existe não vira id inventado", () => {
    const form = propostaParaFormulario(
      draft({ objetivo: { ...draft().objetivo, parent_titulo: "Objetivo que não existe" } }),
      semResolver,
    );
    expect(form.parentId).toBeUndefined();
  });
});

describe("camposParaConferir — o que o preview destaca", () => {
  it("marca só o que não foi citado pelo líder", () => {
    const d = draft({
      key_results: [
        kr({ origem_do_numero: "citado" }),
        kr({ origem_do_numero: "inferido" }),
        kr({ origem_do_numero: "ausente" }),
      ],
    });
    expect(camposParaConferir(d)).toEqual([1, 2]);
  });

  it("proposta toda citada não pede conferência de nada", () => {
    expect(camposParaConferir(draft())).toEqual([]);
  });
});

/**
 * O catálogo semeado é o que ensina o copiloto a configurar cada métrica. Se
 * uma linha dele estiver incoerente, todo KR daquela métrica nasce errado — que
 * é exatamente o problema que o catálogo existe para resolver.
 */
describe("catálogo de métricas — o seed tem que bater com a lib de progresso", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20260908180000_okr_copiloto_fundacao.sql"),
    "utf-8",
  );

  const linhas = [...sql.matchAll(
    /\('([a-z_]+)',\s*'[^']*',\s*ARRAY\[[^\]]*\],\s*\n?\s*'(\w+)',\s*'(up|down)',\s*'([^']*)',\s*(\d+),\s*(\d+),/g,
  )].map((m) => ({
    key: m[1], kr_type: m[2], direction: m[3] as "up" | "down",
    unit: m[4], min: Number(m[5]), max: Number(m[6]),
  }));

  it("todas as métricas do seed foram lidas", () => {
    expect(linhas.map((l) => l.key).sort()).toEqual([
      "cac", "cpmql", "cpv", "logo_churn", "lt_churn", "no_show_rate", "revenue_churn", "speed_to_lead",
    ]);
  });

  it("métrica de teto vira modo teto na lib, com partida zero", () => {
    for (const m of linhas.filter((l) => l.direction === "down")) {
      expect(krMode({ direction: "down", initial_value: 0, target_value: m.max, kr_type: m.kr_type }))
        .toBe("ceiling");
    }
  });

  it("dentro da faixa típica, uma métrica de teto está batida", () => {
    for (const m of linhas.filter((l) => l.direction === "down")) {
      const dentro = { direction: "down", initial_value: 0, target_value: m.max, kr_type: m.kr_type,
        current_value: m.max === 0 ? 0 : m.max - 1, last_checkin_at: "2026-09-08" };
      expect(krProgress(dentro)).toBe(100);
    }
  });

  it("as métricas em que maior é melhor não são teto", () => {
    const sobem = linhas.filter((l) => l.direction === "up").map((l) => l.key);
    expect(sobem).toEqual(["lt_churn"]);
  });

  it("toda métrica tem tipo válido e unidade", () => {
    for (const m of linhas) {
      expect(["numeric", "percent", "currency", "binary", "sla_time"]).toContain(m.kr_type);
      expect(m.unit.length).toBeGreaterThan(0);
      expect(m.min).toBeLessThanOrEqual(m.max);
    }
  });
});

/**
 * A prova que fecha o contrato: o que o copiloto propõe tem que passar pelo
 * MESMO zod que valida o formulário digitado à mão. Se um dos dois mudar
 * sozinho, a proposta passa a ser recusada na hora de salvar — em produção,
 * não aqui.
 */
describe("paridade com o zod do formulário de criação", () => {
  it("todo KR proposto é aceito pelo schema do diálogo", async () => {
    const { keyResultSchema } = await import("@/components/objectives/CreateObjectiveDialog");
    const form = propostaParaFormulario(
      draft({
        key_results: [
          kr(),
          kr({ direction: "up", title: "MQLs por mês", kr_type: "numeric", unit: "leads", initial_value: 800, target_value: 1200 }),
          kr({ kr_type: "percent", title: "Logo churn < 5%", unit: "%", target_value: 5 }),
        ],
      }),
      semResolver,
    );
    for (const k of form.keyResults) {
      const r = keyResultSchema.safeParse(k);
      expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
    }
  });

  it("o schema do formulário conhece todos os campos que o mapeamento produz", async () => {
    const { keyResultSchema } = await import("@/components/objectives/CreateObjectiveDialog");
    const doForm = Object.keys(keyResultSchema.shape).sort();
    const doMapeamento = Object.keys(propostaParaFormulario(draft(), semResolver).keyResults[0]).sort();
    // O formulário pode ter campos que a proposta não preenche; o contrário não.
    for (const campo of doMapeamento) expect(doForm).toContain(campo);
  });
});
