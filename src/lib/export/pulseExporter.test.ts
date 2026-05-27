import { describe, it, expect } from "vitest";
import { rowsToCsv, safeSlug } from "./pulseExporter";

const NON_ANON_ROW = {
  period_start: "2026-05-04",
  respondent_name: "Ana Silva",
  respondent_email: "ana@x.com",
  department: "Engenharia",
  team: "Frontend",
  score: 4,
  emoji: null,
  comment: "Tudo bem",
  created_at: "2026-05-04T12:00:00Z",
};

describe("rowsToCsv", () => {
  it("starts with UTF-8 BOM (\\uFEFF)", () => {
    const csv = rowsToCsv([NON_ANON_ROW], false);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("uses ; as delimiter", () => {
    const csv = rowsToCsv([NON_ANON_ROW], false);
    expect(csv).toContain(";");
    // Não deve usar vírgula como delimitador entre as cells da mesma linha
    const headerLine = csv.split("\r\n")[0];
    expect(headerLine.split(";").length).toBeGreaterThan(5);
  });

  it("anonymous=true does NOT contain name, email, department or team", () => {
    const csv = rowsToCsv([NON_ANON_ROW], true);
    expect(csv).not.toContain("Ana Silva");
    expect(csv).not.toContain("ana@x.com");
    expect(csv).not.toContain("Engenharia");
    expect(csv).not.toContain("Frontend");
  });

  it("anonymous=true headers are limited to non-PII", () => {
    const csv = rowsToCsv([], true);
    const header = csv.replace(/^\uFEFF/, "");
    expect(header).toBe("Período;Nota;Emoji;Comentário;Enviado em");
  });

  it("non-anonymous includes all columns", () => {
    const csv = rowsToCsv([NON_ANON_ROW], false);
    expect(csv).toContain("Ana Silva");
    expect(csv).toContain("ana@x.com");
    expect(csv).toContain("Engenharia");
    expect(csv).toContain("Frontend");
  });

  it("escapes values containing ;, \" or newlines", () => {
    const csv = rowsToCsv(
      [
        {
          ...NON_ANON_ROW,
          comment: 'Resposta "com aspas"; e quebra\nde linha',
        },
      ],
      false,
    );
    // O valor deve estar entre aspas duplas e aspas duplicadas
    expect(csv).toContain('"Resposta ""com aspas""; e quebra\nde linha"');
  });

  it("empty rows still produces valid header", () => {
    const csv = rowsToCsv([], false);
    expect(csv).toContain("Período;Nome;E-mail;Área;Time;Nota;Emoji;Comentário;Enviado em");
  });
});

describe("safeSlug", () => {
  it("normalizes accents and lower-cases", () => {
    expect(safeSlug("Pesquisa de Clima — Geral")).toBe("pesquisa-de-clima-geral");
  });

  it("strips special characters", () => {
    expect(safeSlug("Q3 // 2026 (Engenharia)")).toBe("q3-2026-engenharia");
  });

  it("falls back to 'pulse' for empty input", () => {
    expect(safeSlug("***")).toBe("pulse");
  });

  it("clamps to 50 chars", () => {
    const long = "a".repeat(100);
    expect(safeSlug(long).length).toBeLessThanOrEqual(50);
  });
});
