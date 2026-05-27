import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Building2, UserPlus, PieChart } from "lucide-react";
import { usePeopleList } from "@/hooks/usePeopleList";
import { useDepartmentOptions } from "@/hooks/usePeopleWithBirthdays";
import { exportToCSV } from "@/lib/csvExport";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export function HRReportsTab() {
  const { data: people, isLoading } = usePeopleList();
  const { data: departments = [] } = useDepartmentOptions();

  const handleHeadcountExport = () => {
    if (!people) return;
    const deptCounts = new Map<string, number>();
    people.filter((p) => p.status === "active").forEach((p) => {
      const dept = p.department_info?.name || "Sem área";
      deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);
    });
    const rows = Array.from(deptCounts.entries()).map(([dept, count]) => ({
      Área: dept,
      Quantidade: count,
    }));
    exportToCSV(rows, `headcount-area-${format(new Date(), "yyyy-MM-dd")}`);
    toast.success("Relatório exportado com sucesso!");
  };

  const handleAdmissionsExport = () => {
    if (!people) return;
    const rows = people
      .filter((p) => p.hire_date)
      .map((p) => ({
        Nome: p.user?.full_name || "Sem nome",
        Email: p.user?.email || "",
        Cargo: p.position || "",
        Área: p.department_info?.name || "",
        "Tipo Contratação": p.employment_type || "",
        "Data Admissão": p.hire_date ? format(parseISO(p.hire_date), "dd/MM/yyyy", { locale: ptBR }) : "",
        Status: p.status,
      }))
      .sort((a, b) => (b["Data Admissão"] || "").localeCompare(a["Data Admissão"] || ""));
    exportToCSV(rows, `admissoes-desligamentos-${format(new Date(), "yyyy-MM-dd")}`);
    toast.success("Relatório exportado com sucesso!");
  };

  const handleDemographicsExport = () => {
    if (!people) return;
    const typeCounts = new Map<string, number>();
    people.filter((p) => p.status === "active").forEach((p) => {
      const type = p.employment_type || "Não informado";
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });
    const rows = Array.from(typeCounts.entries()).map(([type, count]) => ({
      "Tipo Contratação": type,
      Quantidade: count,
    }));
    exportToCSV(rows, `demograficos-${format(new Date(), "yyyy-MM-dd")}`);
    toast.success("Relatório exportado com sucesso!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const reports = [
    {
      title: "Headcount por Área",
      description: "Quantidade de colaboradores ativos agrupados por área.",
      icon: Building2,
      onExport: handleHeadcountExport,
      stats: `${departments.length} áreas`,
    },
    {
      title: "Admissões e Desligamentos",
      description: "Lista completa de colaboradores com datas de admissão e status atual.",
      icon: UserPlus,
      onExport: handleAdmissionsExport,
      stats: `${people?.filter((p) => p.hire_date).length || 0} registros`,
    },
    {
      title: "Dados Demográficos",
      description: "Distribuição de colaboradores ativos por tipo de contratação (CLT, PJ, etc.).",
      icon: PieChart,
      onExport: handleDemographicsExport,
      stats: `${people?.filter((p) => p.status === "active").length || 0} ativos`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reports.map((report) => {
        const Icon = report.icon;
        return (
          <Card key={report.title}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription className="text-xs mt-1">{report.stats}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{report.description}</p>
              <Button variant="outline" className="w-full gap-2" onClick={report.onExport}>
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
