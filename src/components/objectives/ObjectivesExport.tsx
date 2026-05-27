import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { ObjectiveWithDetails } from "@/hooks/useObjectives";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface ObjectivesExportProps {
  objectives: ObjectiveWithDetails[];
}

export function ObjectivesExport({ objectives }: ObjectivesExportProps) {
  const generateCSV = () => {
    const headers = [
      "Título",
      "Descrição",
      "Tipo",
      "Status",
      "Progresso",
      "Data Limite",
      "Responsável",
      "Time",
      "Área",
      "Visibilidade",
      "Key Results",
    ];

    const rows = objectives.map((obj) => {
      const keyResultsText = obj.key_results
        .map(
          (kr) =>
            `${kr.title}: ${kr.current_value}/${kr.target_value} ${kr.unit || ""}`
        )
        .join("; ");

      return [
        obj.title,
        obj.description || "",
        obj.type,
        obj.status,
        `${obj.progress}%`,
        obj.due_date
          ? format(new Date(obj.due_date), "dd/MM/yyyy", { locale: ptBR })
          : "",
        obj.owner?.full_name || obj.owner?.email || "",
        obj.team?.name || "",
        (obj.team as any)?.department || "",
        obj.visibility,
        keyResultsText,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return csvContent;
  };

  const generateDetailedCSV = () => {
    const headers = [
      "Objetivo",
      "Key Result",
      "Valor Atual",
      "Meta",
      "Unidade",
      "Progresso KR",
      "Status Objetivo",
      "Responsável",
      "Time",
      "Área",
    ];

    const rows: string[][] = [];

    objectives.forEach((obj) => {
      if (obj.key_results.length === 0) {
        rows.push([
          obj.title,
          "-",
          "-",
          "-",
          "-",
          "-",
          obj.status,
          obj.owner?.full_name || obj.owner?.email || "",
          obj.team?.name || "",
          (obj.team as any)?.department || "",
        ]);
      } else {
        obj.key_results.forEach((kr) => {
          const krProgress =
            kr.target_value > 0
              ? Math.round((Number(kr.current_value) / Number(kr.target_value)) * 100)
              : 0;

          rows.push([
            obj.title,
            kr.title,
            String(kr.current_value),
            String(kr.target_value),
            kr.unit || "",
            `${krProgress}%`,
            obj.status,
            obj.owner?.full_name || obj.owner?.email || "",
            obj.team?.name || "",
            (obj.team as any)?.department || "",
          ]);
        });
      }
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return csvContent;
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(["\ufeff" + content], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Arquivo exportado com sucesso!");
  };

  const handleExportSummary = () => {
    const csv = generateCSV();
    const date = format(new Date(), "yyyy-MM-dd", { locale: ptBR });
    downloadCSV(csv, `objetivos-resumo-${date}.csv`);
  };

  const handleExportDetailed = () => {
    const csv = generateDetailedCSV();
    const date = format(new Date(), "yyyy-MM-dd", { locale: ptBR });
    downloadCSV(csv, `objetivos-detalhado-${date}.csv`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportSummary}>
          <FileText className="h-4 w-4 mr-2" />
          CSV - Resumo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportDetailed}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          CSV - Detalhado (com KRs)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
