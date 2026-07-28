import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, Building2 } from "lucide-react";
import { usePeopleStats } from "@/hooks/usePeopleList";

/**
 * Cartões de resumo de pessoas da aba **Visão Geral** do RH.
 *
 * Cada métrica mantém um tom próprio (primary/success/accent/warning), agora
 * via tokens semânticos do tema — nada de paleta crua (`bg-blue-100` etc.) para
 * respeitar dark/light. Os tons espelham os de `HRCollaboratorStats` para que a
 * mesma métrica tenha a mesma cor nas duas abas.
 *
 * NÃO unificado com `HRCollaboratorStats` (aba Colaboradores) de propósito: as
 * mesmas 4 métricas (`usePeopleStats`) são apresentadas de formas diferentes por
 * contexto — aqui um card espaçoso com header e número grande (dashboard); lá um
 * card compacto de header de tabela. Divergem também rótulos ("Total
 * Colaboradores"/"Novos no Mês" vs "Total"/"Novos este mês"), ícone de "novos"
 * (UserX vs UserPlus) e tratamento de loading/erro (traço vs Skeleton + "—").
 * Parametrizar um único componente exigiria um `variant` que reintroduz os dois
 * layouts — mais complexo e mudaria o que cada aba exibe. Mantidos separados.
 */
export function HRStats() {
  const { data: stats, isLoading } = usePeopleStats();

  const statItems = [
    {
      title: "Total Colaboradores",
      value: isLoading ? "-" : (stats?.total || 0),
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Ativos",
      value: isLoading ? "-" : (stats?.active || 0),
      icon: UserCheck,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Novos no Mês",
      value: isLoading ? "-" : (stats?.newThisMonth || 0),
      icon: UserX,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Áreas",
      value: isLoading ? "-" : (stats?.departments || 0),
      icon: Building2,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
