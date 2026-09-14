import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guarda de paridade entre a tela e a RLS.
 *
 * O sintoma que originou isto: o dono de um objetivo não conseguia excluir um
 * KR dele porque o painel de detalhe exigia `tier === "manager" || isAdmin`,
 * enquanto `can_edit_objective` no banco já aceitava dono, responsável,
 * colaborador editor, quem lidera o dono e quem lidera o time. Botão escondido
 * onde o banco aceitaria é tão ruim quanto botão que aparece e dá erro.
 */
const ler = (p: string) => readFileSync(resolve(process.cwd(), p), "utf-8");

describe("permissão de OKR na tela espelha a do banco", () => {
  it("exclusão de objetivo considera o dono, não só o criador", () => {
    const src = ler("src/hooks/useUserPermissions.ts");
    const bloco = src.slice(src.indexOf("const canDeleteObjective"), src.indexOf("// OKR tier"));
    expect(bloco).toMatch(/owner_id/);
    expect(bloco).toMatch(/created_by/);
    expect(bloco).toMatch(/isAdmin/);
  });

  it("edição de KR no painel não volta a depender só do tier", () => {
    const src = ler("src/components/objectives/ObjectiveDetailPanel.tsx");
    // A linha exata que causou o problema.
    expect(src).not.toMatch(/const canEditKr = tier === "manager" \|\| isAdmin;/);
    expect(src).toMatch(/canEditKr = canEditObjective\(/);
  });

  it("quem chama a exclusão informa o dono do objetivo", () => {
    for (const arquivo of [
      "src/components/objectives/ObjectiveCard.tsx",
      "src/components/objectives/ObjectiveTreeNode.tsx",
    ]) {
      const src = ler(arquivo);
      const chamada = src.slice(src.indexOf("canDeleteObjective({"), src.indexOf("canDeleteObjective({") + 200);
      expect(chamada, arquivo).toMatch(/owner_id/);
    }
  });
});
