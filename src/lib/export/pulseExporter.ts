import * as XLSX from "xlsx";

export interface PulseExportRow {
  period_start: string;
  respondent_name?: string | null;
  respondent_email?: string | null;
  department?: string | null;
  team?: string | null;
  score: number;
  emoji?: string | null;
  comment?: string | null;
  created_at: string;
}

const ANON_HEADERS_PT = ["Período", "Nota", "Emoji", "Comentário", "Enviado em"];
const FULL_HEADERS_PT = [
  "Período",
  "Nome",
  "E-mail",
  "Área",
  "Time",
  "Nota",
  "Emoji",
  "Comentário",
  "Enviado em",
];

const UTF8_BOM = "﻿";

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[;"\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Pulse anônimo: filtra colunas PII no nível do tipo. Mesmo que o caller
 * envie name/email/department/team, o util ignora — defesa em profundidade.
 */
export function rowsToCsv(rows: PulseExportRow[], anonymous: boolean): string {
  const headers = anonymous ? ANON_HEADERS_PT : FULL_HEADERS_PT;
  const lines = [headers.join(";")];
  for (const r of rows) {
    if (anonymous) {
      lines.push(
        [
          escapeCsvCell(r.period_start),
          escapeCsvCell(r.score),
          escapeCsvCell(r.emoji ?? ""),
          escapeCsvCell(r.comment ?? ""),
          escapeCsvCell(r.created_at),
        ].join(";"),
      );
    } else {
      lines.push(
        [
          escapeCsvCell(r.period_start),
          escapeCsvCell(r.respondent_name ?? ""),
          escapeCsvCell(r.respondent_email ?? ""),
          escapeCsvCell(r.department ?? ""),
          escapeCsvCell(r.team ?? ""),
          escapeCsvCell(r.score),
          escapeCsvCell(r.emoji ?? ""),
          escapeCsvCell(r.comment ?? ""),
          escapeCsvCell(r.created_at),
        ].join(";"),
      );
    }
  }
  return UTF8_BOM + lines.join("\r\n");
}

export function rowsToXlsx(
  rows: PulseExportRow[],
  anonymous: boolean,
  sheetName: string,
): ArrayBuffer {
  const cleanRows = rows.map((r) =>
    anonymous
      ? {
          Período: r.period_start,
          Nota: r.score,
          Emoji: r.emoji ?? "",
          Comentário: r.comment ?? "",
          "Enviado em": r.created_at,
        }
      : {
          Período: r.period_start,
          Nome: r.respondent_name ?? "",
          "E-mail": r.respondent_email ?? "",
          Área: r.department ?? "",
          Time: r.team ?? "",
          Nota: r.score,
          Emoji: r.emoji ?? "",
          Comentário: r.comment ?? "",
          "Enviado em": r.created_at,
        },
  );

  const sheet = XLSX.utils.json_to_sheet(cleanRows);
  const wb = XLSX.utils.book_new();
  // Excel: nome da sheet máx 31 chars, sem caracteres proibidos
  const safeName = sheetName
    .replace(/[\\/?*[\]:]/g, "_")
    .slice(0, 31)
    .trim() || "Pulse";
  XLSX.utils.book_append_sheet(wb, sheet, safeName);
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

/** Util de slug seguro para nome de arquivo. */
export function safeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "pulse";
}

export function downloadBlob(content: BlobPart, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
