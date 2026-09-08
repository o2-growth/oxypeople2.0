import { describe, it, expect, vi, afterEach } from "vitest";
import { podeCorrigirAvaliacao, cicloAberto, dentroDoPrazo } from "./correcao";

const EU = "11111111-1111-1111-1111-111111111111";
const OUTRA = "22222222-2222-2222-2222-222222222222";

// O ciclo real que expôs o problema: prazo de resposta na mesma data em que
// começou, ciclo rodando até bem depois.
const cicloAtivo = {
  status: "active",
  start_date: "2026-08-28",
  end_date: "2026-09-11",
  response_deadline: "2026-08-28",
};

const avaliacao = (over: Record<string, unknown> = {}) => ({
  evaluator_id: EU,
  status: "completed",
  cycle: cicloAtivo,
  ...over,
});

afterEach(() => vi.useRealTimers());

const hoje = (data: string) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${data}T09:00:00-03:00`));
};

describe("podeCorrigirAvaliacao", () => {
  it("libera para quem avaliou enquanto o ciclo está aberto, mesmo com o prazo de resposta vencido", () => {
    hoje("2026-09-07");
    expect(podeCorrigirAvaliacao(avaliacao(), EU)).toBe(true);
  });

  it("não libera para quem só recebeu a avaliação", () => {
    hoje("2026-09-07");
    expect(podeCorrigirAvaliacao(avaliacao({ evaluator_id: OUTRA }), EU)).toBe(false);
  });

  it("não libera o que ainda não foi enviado — aí o caminho é responder, não corrigir", () => {
    hoje("2026-09-07");
    expect(podeCorrigirAvaliacao(avaliacao({ status: "in_progress" }), EU)).toBe(false);
  });

  it("fecha quando o ciclo é encerrado e o prazo já passou", () => {
    hoje("2026-09-07");
    const encerrado = { ...cicloAtivo, status: "completed" };
    expect(podeCorrigirAvaliacao(avaliacao({ cycle: encerrado }), EU)).toBe(false);
  });

  it("segue liberado no ciclo encerrado se o prazo de resposta ainda corre", () => {
    hoje("2026-09-07");
    const encerrado = { status: "completed", end_date: "2026-09-30", response_deadline: "2026-09-20" };
    expect(podeCorrigirAvaliacao(avaliacao({ cycle: encerrado }), EU)).toBe(true);
  });

  it("sem sessão carregada não mostra nada", () => {
    hoje("2026-09-07");
    expect(podeCorrigirAvaliacao(avaliacao(), undefined)).toBe(false);
    expect(podeCorrigirAvaliacao(null, EU)).toBe(false);
  });
});

describe("janela do ciclo", () => {
  it("só o ciclo rodando conta como aberto", () => {
    expect(cicloAberto(cicloAtivo)).toBe(true);
    expect(cicloAberto({ status: "completed" })).toBe(false);
    expect(cicloAberto(null)).toBe(false);
  });

  it("o dia do vencimento vale inteiro", () => {
    hoje("2026-08-28");
    expect(dentroDoPrazo(cicloAtivo)).toBe(true);
    hoje("2026-08-29");
    expect(dentroDoPrazo(cicloAtivo)).toBe(false);
  });

  it("cai no fim do ciclo quando não há prazo de resposta", () => {
    hoje("2026-09-07");
    expect(dentroDoPrazo({ status: "completed", end_date: "2026-09-11", response_deadline: null })).toBe(true);
    expect(dentroDoPrazo({ status: "completed", end_date: "2026-09-01", response_deadline: null })).toBe(false);
  });
});
