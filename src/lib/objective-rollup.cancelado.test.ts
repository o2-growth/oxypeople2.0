import { describe, it, expect } from "vitest";
import { rollup } from "./objective-rollup";
import type { ObjectiveWithDetails } from "@/hooks/useObjectives";

/**
 * Objetivo cancelado é trabalho encerrado, não trabalho pendente.
 *
 * Um OKR arquivado em 0% estava puxando a média do pai para baixo — o "OKR
 * Operações — Q3/2026" mostrava 47% quando os filhos de pé davam 52%. Excluído
 * e cancelado são coisas diferentes, mas nenhum dos dois é entrega esperada.
 * Concluído continua contando, porque foi entregue.
 */
const filho = (progress: number, status: string): ObjectiveWithDetails =>
  ({ id: `f-${progress}-${status}`, progress, status, expected_progress: progress, children: [] }) as unknown as ObjectiveWithDetails;

const pai = (filhos: ObjectiveWithDetails[]): ObjectiveWithDetails =>
  ({ id: "pai", progress: 0, status: "active", expected_progress: 0, children: filhos }) as unknown as ObjectiveWithDetails;

const semPeso = () => 0;

describe("rollup ignora filho cancelado", () => {
  it("cancelado em 0% não derruba a média", () => {
    const comCancelado = pai([filho(100, "active"), filho(0, "canceled")]);
    expect(rollup(comCancelado, semPeso).progress).toBe(100);
  });

  it("concluído conta normalmente — foi entregue", () => {
    const p = pai([filho(100, "completed"), filho(50, "active")]);
    expect(rollup(p, semPeso).progress).toBe(75);
  });

  it("o caso real: 11 filhos, 1 cancelado", () => {
    const ativos = [80, 60, 100, 40, 30, 55, 70, 20, 45, 50].map((v) => filho(v, "active"));
    const p = pai([...ativos, filho(0, "canceled")]);
    const media = Math.round(ativos.reduce((s, f) => s + (f.progress ?? 0), 0) / ativos.length);
    expect(rollup(p, semPeso).progress).toBe(media);
  });

  it("todos os filhos cancelados: cai para a folha, sem dividir por zero", () => {
    const p = pai([filho(0, "canceled"), filho(0, "canceled")]);
    expect(rollup(p, semPeso).progress).toBe(0);
  });
});
