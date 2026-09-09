import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { OKR_DRAFT_SCHEMA, validarProposta } from "./draft-contract";

/**
 * O contrato da proposta vive em dois arquivos porque a edge function roda em
 * Deno e não importa de `src/`. Duplicação de definição é exatamente como o
 * cálculo de progresso de KR divergiu entre front e banco antes — aqui a cópia
 * é literal e este teste é o que garante isso.
 */
const FRONT = "src/lib/okr/draft-contract.ts";
const FUNCTION = "supabase/functions/_shared/okr-draft-contract.ts";

/** Corpo = arquivo sem o comentário de cabeçalho, que é diferente de propósito. */
const corpo = (caminho: string) => {
  const src = readFileSync(resolve(process.cwd(), caminho), "utf-8");
  return src.split("*/", 2)[1].trim();
};

describe("contrato da proposta — front e edge function não podem divergir", () => {
  it("os dois arquivos têm o mesmo corpo", () => {
    expect(corpo(FUNCTION)).toBe(corpo(FRONT));
  });

  it("o schema é fechado: nenhum objeto aceita campo extra", () => {
    const objetos: unknown[] = [];
    const varrer = (n: unknown) => {
      if (!n || typeof n !== "object") return;
      const no = n as Record<string, unknown>;
      if (no.type === "object") objetos.push(no);
      Object.values(no).forEach(varrer);
    };
    varrer(OKR_DRAFT_SCHEMA);
    expect(objetos.length).toBeGreaterThan(2);
    for (const o of objetos) {
      expect((o as Record<string, unknown>).additionalProperties).toBe(false);
      expect(Array.isArray((o as Record<string, unknown>).required)).toBe(true);
    }
  });

  it("todo campo do objeto está em required — schema aberto não garante forma", () => {
    const kr = OKR_DRAFT_SCHEMA.properties.key_results.items;
    expect(Object.keys(kr.properties).sort()).toEqual([...kr.required].sort());
  });
});

describe("validarProposta — a barreira de sentido, depois da de forma", () => {
  const kr = (over: Partial<Record<string, unknown>> = {}) => ({
    title: "CPMQL Modelo atual < R$ 500",
    kr_type: "currency", direction: "down",
    initial_value: 0, target_value: 500, unit: "R$",
    weight_percentage: 0, owner_nome: null,
    origem_do_numero: "citado", confianca: "alta", racional: "…",
    ...over,
  });
  const draft = (krs: unknown[]) => ({
    objetivo: { title: "Baixar o CAC", description: "…", type: "operational", commitment_type: "committed", parent_titulo: null },
    key_results: krs, perguntas: [], avisos: [],
  });

  it("aceita uma proposta de teto bem formada", () => {
    expect(validarProposta(draft([kr()]))).toEqual({ ok: true, erros: [] });
  });

  it("recusa teto com ponto de partida acima do limite", () => {
    // Passaria pelo schema e viraria "redução" na lib de progresso, medindo
    // outra coisa — o erro que derrubou o dashboard em 08/09.
    const r = validarProposta(draft([kr({ initial_value: 800 })]));
    expect(r.ok).toBe(false);
    expect(r.erros[0]).toMatch(/teto/);
  });

  it("recusa subida com meta menor que a partida", () => {
    const r = validarProposta(draft([kr({ direction: "up", title: "Receita", initial_value: 100, target_value: 50 })]));
    expect(r.ok).toBe(false);
  });

  it("recusa soma de pesos que não é 0 nem 100", () => {
    const r = validarProposta(draft([kr({ weight_percentage: 60 })]));
    expect(r.ok).toBe(false);
    expect(r.erros[0]).toMatch(/pesos/);
  });

  it("recusa resposta vazia ou sem KR", () => {
    expect(validarProposta(null).ok).toBe(false);
    expect(validarProposta(draft([])).ok).toBe(false);
  });
});
