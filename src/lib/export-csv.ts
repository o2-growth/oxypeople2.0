/**
 * Exportação de CSV compartilhada.
 *
 * Consolida a construção manual de CSV duplicada nos dashboards admin
 * (PDIDashboard, OneOnOnesDashboard). Delimitado por vírgula, com BOM para o
 * Excel interpretar UTF-8 corretamente.
 */

type Cell = string | number | null | undefined;

const BOM = "﻿";

function escapeCell(value: Cell): string {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Cell[][],
): void {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];
  const csv = BOM + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
