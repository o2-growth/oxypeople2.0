import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guarda estrutural (não tautológica): garante que NENHUMA visão reimplemente a
 * fórmula de progresso de KR inline — todas devem consumir a lib canônica
 * `@/lib/kr-progress` (krProgress / krProgressForValue). Complementa os testes
 * de valor: um teste de unidade puro não consegue detectar reimplementação na UI,
 * então aqui varremos o código-fonte dos consumidores.
 *
 * Se um novo consumidor de % de KR surgir, adicione-o à lista.
 */
const CONSUMERS = [
  "src/components/objectives/CheckinDialog.tsx",
  "src/components/objectives/BulkCheckinDialog.tsx",
  "src/components/objectives/ProgressChart.tsx",
  "src/components/objectives/ObjectivesExport.tsx",
  "src/components/objectives/KeyResultItem.tsx",
  "src/components/objectives/MyOkrsView.tsx",
  "src/components/objectives/CompanyOkrsList.tsx",
  "src/pages/OkrOverview.tsx",
];

// Assinaturas de fórmula de progresso de KR calculada à mão (proibidas fora da lib).
const INLINE_FORMULA = /target_value\s*-\s*initial|new_value\s*-\s*initial|current_value\s*\)?\s*\/\s*(Number\()?\s*(kr\.)?target_value/;

describe("progresso de KR — fonte única (sem reimplementação inline)", () => {
  it.each(CONSUMERS)("%s consome a lib canônica e não recalcula a fórmula", (file) => {
    const src = readFileSync(resolve(process.cwd(), file), "utf-8");
    expect(src, `${file} deve importar krProgress/krProgressForValue de @/lib`).toMatch(
      /krProgress(ForValue)?/,
    );
    expect(src, `${file} não pode conter fórmula de progresso de KR inline`).not.toMatch(
      INLINE_FORMULA,
    );
  });
});
