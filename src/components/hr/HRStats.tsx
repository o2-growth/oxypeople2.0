import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, Building2 } from "lucide-react";
import { usePeopleStats } from "@/hooks/usePeopleList";

export function HRStats() {
  const { data: stats, isLoading } = usePeopleStats();

  const statItems = [
    {
      title: "Total Colaboradores",
      value: isLoading ? "-" : (stats?.total || 0),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Ativos",
      value: isLoading ? "-" : (stats?.active || 0),
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Novos no Mês",
      value: isLoading ? "-" : (stats?.newThisMonth || 0),
      icon: UserX,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: "Áreas",
      value: isLoading ? "-" : (stats?.departments || 0),
      icon: Building2,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
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
