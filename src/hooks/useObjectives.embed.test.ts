import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guarda estrutural: todo embed de `key_results` filtra o excluído.
 *
 * No PostgREST o filtro do pai não desce para o recurso embutido. Sem o filtro
 * explícito, KR excluído continua chegando em tudo que consome o hook — foi o
 * que manteve um KR apagado em 14/09 aparecendo em "objetivos para check-in"
 * mesmo depois de recarregar a página, e fez parecer que a exclusão não tinha
 * funcionado.
 *
 * `.is("key_results.deleted_at", null)` não esconde objetivo sem KR: o pai vem
 * com a lista vazia (verificado contra a API em 15/09).
 */
const ARQUIVOS = ["src/hooks/useObjectives.ts"];

describe("embed de key_results esconde o que foi excluído", () => {
  it.each(ARQUIVOS)("%s filtra deleted_at no embed", (arquivo) => {
    const src = readFileSync(resolve(process.cwd(), arquivo), "utf-8");
    const temEmbed = /key_results\s*\(/.test(src);
    if (!temEmbed) return;
    expect(src, `${arquivo} embute key_results sem filtrar excluídos`).toMatch(
      /key_results\.deleted_at/,
    );
  });

  it("nenhum outro arquivo embute key_results sem o filtro", () => {
    // Se um consumidor novo aparecer, ou entra com o filtro ou entra nesta lista.
    const { execSync } = require("node:child_process");
    const saida = execSync(
      `grep -rln "key_results(" src/ --include="*.ts" --include="*.tsx" || true`,
      { encoding: "utf-8" },
    ).trim();
    const arquivos = saida ? saida.split("\n").filter(Boolean) : [];
    for (const a of arquivos) {
      if (a.endsWith(".test.ts") || a.endsWith(".test.tsx")) continue;
      const src = readFileSync(resolve(process.cwd(), a), "utf-8");
      // Embed com seleção de colunas conta igual.
      if (/\.select\([\s\S]*key_results\s*\(/.test(src)) {
        expect(src, `${a} precisa de .is("key_results.deleted_at", null)`).toMatch(
          /key_results\.deleted_at/,
        );
      }
    }
  });
});
