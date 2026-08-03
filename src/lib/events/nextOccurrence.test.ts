import { describe, it, expect } from "vitest";
import { nextOccurrence } from "@/hooks/useCompanyEvents";

// Referência fixa: 03/08/2026.
const hoje = new Date("2026-08-03T12:00:00Z");

describe("nextOccurrence", () => {
  it("mantém o ano corrente quando a data ainda não chegou", () => {
    expect(nextOccurrence("2026-12-25", hoje)).toBe("2026-12-25");
    expect(nextOccurrence("2026-08-04", hoje)).toBe("2026-08-04");
  });

  it("joga para o ano seguinte quando a data já passou", () => {
    expect(nextOccurrence("2026-03-18", hoje)).toBe("2027-03-18");
    expect(nextOccurrence("2026-08-02", hoje)).toBe("2027-08-02");
  });

  it("trata a data de hoje como ainda vigente", () => {
    expect(nextOccurrence("2026-08-03", hoje)).toBe("2026-08-03");
  });

  // O importador grava o aniversário com o ano corrente como âncora, mas o
  // dado de origem é a data de nascimento real — o ano guardado é irrelevante.
  it("ignora o ano da âncora e usa só dia/mês", () => {
    expect(nextOccurrence("1985-03-18", hoje)).toBe("2027-03-18");
    expect(nextOccurrence("1979-12-09", hoje)).toBe("2026-12-09");
  });

  it("preserva 29 de fevereiro sem inventar data", () => {
    expect(nextOccurrence("2026-02-29", hoje)).toBe("2027-02-29");
  });

  it("devolve a entrada quando a data é inválida", () => {
    expect(nextOccurrence("sem-data", hoje)).toBe("sem-data");
  });
});
