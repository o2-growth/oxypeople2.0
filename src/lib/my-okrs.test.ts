import { describe, it, expect } from "vitest";
import {
  collectMyKrs,
  krProgress,
  ownsActiveKr,
  isObjectiveActive,
  DEFAULT_CHECKIN_OVERDUE_DAYS,
} from "./my-okrs";
import type { ObjectiveWithDetails } from "@/hooks/useObjectives";
import type { Database } from "@/integrations/supabase/types";

type KeyResultRow = Database["public"]["Tables"]["key_results"]["Row"];

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 28); // referência fixa e determinística

function makeKr(over: Partial<KeyResultRow> = {}): KeyResultRow {
  return {
    id: over.id ?? "kr-1",
    objective_id: over.objective_id ?? "obj-1",
    title: over.title ?? "KR",
    target_value: over.target_value ?? 100,
    current_value: over.current_value ?? 0,
    initial_value: over.initial_value ?? 0,
    unit: over.unit ?? "%",
    kr_type: over.kr_type ?? "numeric",
    direction: over.direction ?? "up",
    status: over.status ?? "active",
    owner_user_id: over.owner_user_id ?? null,
    last_checkin_at: over.last_checkin_at ?? null,
    checkin_frequency: over.checkin_frequency ?? null,
    weight_percentage: over.weight_percentage ?? 0,
    is_automatic: over.is_automatic ?? false,
    data_source: over.data_source ?? null,
    deleted_at: over.deleted_at ?? null,
    created_at: over.created_at ?? "2026-01-01T00:00:00Z",
    updated_at: over.updated_at ?? "2026-01-01T00:00:00Z",
  };
}

function makeObj(over: Partial<ObjectiveWithDetails> = {}): ObjectiveWithDetails {
  return {
    id: over.id ?? "obj-1",
    title: over.title ?? "Objetivo",
    status: over.status ?? "active",
    owner_id: over.owner_id ?? "owner-x",
    team: over.team ?? null,
    key_results: over.key_results ?? [],
    ...over,
  } as unknown as ObjectiveWithDetails;
}

describe("krProgress", () => {
  it("up: proporcional entre initial e target", () => {
    expect(krProgress(makeKr({ initial_value: 0, current_value: 50, target_value: 100 }))).toBe(50);
    expect(krProgress(makeKr({ initial_value: 20, current_value: 60, target_value: 100 }))).toBe(50);
  });

  it("clampa entre 0 e 100", () => {
    expect(krProgress(makeKr({ initial_value: 0, current_value: -10, target_value: 100 }))).toBe(0);
    expect(krProgress(makeKr({ initial_value: 0, current_value: 200, target_value: 100 }))).toBe(100);
  });

  it("down: progride quando o valor cai em direção à meta", () => {
    expect(krProgress(makeKr({ direction: "down", initial_value: 100, current_value: 50, target_value: 0 }))).toBe(50);
  });

  it("binary: 100 só quando atinge a meta", () => {
    expect(krProgress(makeKr({ kr_type: "binary", current_value: 0, target_value: 1 }))).toBe(0);
    expect(krProgress(makeKr({ kr_type: "binary", current_value: 1, target_value: 1 }))).toBe(100);
  });

  it("span zero: 100 se já atingiu, senão 0", () => {
    expect(krProgress(makeKr({ initial_value: 100, current_value: 100, target_value: 100 }))).toBe(100);
    expect(krProgress(makeKr({ initial_value: 100, current_value: 50, target_value: 100 }))).toBe(0);
  });
});

describe("isObjectiveActive", () => {
  it("exclui concluídos e cancelados", () => {
    expect(isObjectiveActive({ status: "active" })).toBe(true);
    expect(isObjectiveActive({ status: "planned" })).toBe(true);
    expect(isObjectiveActive({ status: "completed" })).toBe(false);
    expect(isObjectiveActive({ status: "canceled" })).toBe(false);
  });
});

describe("ownsActiveKr", () => {
  it("reconhece KR com owner explícito", () => {
    const obj = makeObj({ key_results: [makeKr({ owner_user_id: "me" })] });
    expect(ownsActiveKr([obj], "me")).toBe(true);
    expect(ownsActiveKr([obj], "outra")).toBe(false);
  });

  it("herda o dono do objetivo quando o KR não tem owner", () => {
    const obj = makeObj({ owner_id: "me", key_results: [makeKr({ owner_user_id: null })] });
    expect(ownsActiveKr([obj], "me")).toBe(true);
  });

  it("ignora objetivo concluído/cancelado e KR concluído/cancelado", () => {
    expect(ownsActiveKr([makeObj({ status: "completed", key_results: [makeKr({ owner_user_id: "me" })] })], "me")).toBe(false);
    expect(ownsActiveKr([makeObj({ key_results: [makeKr({ owner_user_id: "me", status: "completed" })] })], "me")).toBe(false);
  });

  it("false quando meId ausente", () => {
    const obj = makeObj({ key_results: [makeKr({ owner_user_id: "me" })] });
    expect(ownsActiveKr([obj], null)).toBe(false);
    expect(ownsActiveKr([obj], undefined)).toBe(false);
  });
});

describe("collectMyKrs", () => {
  it("marca pendente quando nunca houve check-in ou está velho; não-pendente quando recente", () => {
    const objs = [
      makeObj({ id: "o", key_results: [
        makeKr({ id: "never", owner_user_id: "me", last_checkin_at: null }),
        makeKr({ id: "old", owner_user_id: "me", last_checkin_at: new Date(NOW - 30 * DAY_MS).toISOString() }),
        makeKr({ id: "fresh", owner_user_id: "me", last_checkin_at: new Date(NOW - 1 * DAY_MS).toISOString() }),
      ] }),
    ];
    const result = collectMyKrs(objs, "me", DEFAULT_CHECKIN_OVERDUE_DAYS, NOW);
    const byId = Object.fromEntries(result.map((r) => [r.kr.id, r.pending]));
    expect(byId.never).toBe(true);
    expect(byId.old).toBe(true);
    expect(byId.fresh).toBe(false);
  });

  it("ordena pendentes primeiro e, dentro do grupo, menor progresso antes", () => {
    const objs = [
      makeObj({ id: "o", key_results: [
        makeKr({ id: "done-hi", owner_user_id: "me", current_value: 90, last_checkin_at: new Date(NOW).toISOString() }),
        makeKr({ id: "pend-hi", owner_user_id: "me", current_value: 80, last_checkin_at: null }),
        makeKr({ id: "pend-lo", owner_user_id: "me", current_value: 10, last_checkin_at: null }),
      ] }),
    ];
    const order = collectMyKrs(objs, "me", DEFAULT_CHECKIN_OVERDUE_DAYS, NOW).map((r) => r.kr.id);
    expect(order).toEqual(["pend-lo", "pend-hi", "done-hi"]);
  });

  it("anexa contexto (objetivo/time) e exclui KRs que não são meus/ativos", () => {
    const objs = [
      makeObj({ id: "o1", title: "Crescer receita", team: { id: "t", name: "Vendas", department: null } as ObjectiveWithDetails["team"], key_results: [
        makeKr({ id: "mine", owner_user_id: "me" }),
        makeKr({ id: "theirs", owner_user_id: "outra" }),
        makeKr({ id: "mine-done", owner_user_id: "me", status: "completed" }),
      ] }),
      makeObj({ id: "o2", status: "canceled", key_results: [makeKr({ id: "in-canceled", owner_user_id: "me" })] }),
    ];
    const result = collectMyKrs(objs, "me", DEFAULT_CHECKIN_OVERDUE_DAYS, NOW);
    expect(result.map((r) => r.kr.id)).toEqual(["mine"]);
    expect(result[0].objectiveTitle).toBe("Crescer receita");
    expect(result[0].teamName).toBe("Vendas");
  });

  it("retorna vazio quando meId ausente", () => {
    const objs = [makeObj({ key_results: [makeKr({ owner_user_id: "me" })] })];
    expect(collectMyKrs(objs, null, DEFAULT_CHECKIN_OVERDUE_DAYS, NOW)).toEqual([]);
  });
});
