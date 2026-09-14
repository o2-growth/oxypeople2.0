import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * O servidor MCP roda em Deno e responde perguntas do tipo "o CAC está dentro
 * da meta?". A resposta tem que sair da mesma conta da tela — por isso a lib é
 * copiada para `_shared` e por isso este teste existe.
 */
const corpo = (caminho: string) =>
  readFileSync(resolve(process.cwd(), caminho), "utf-8").split("*/", 2)[1].trim();

describe("lib de progresso — front e MCP não podem divergir", () => {
  it("o espelho em _shared tem o mesmo corpo", () => {
    expect(corpo("supabase/functions/_shared/kr-progress.ts")).toBe(corpo("src/lib/kr-progress.ts"));
  });
});
