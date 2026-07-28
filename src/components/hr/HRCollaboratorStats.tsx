import type { LucideIcon } from "lucide-react";
import { Users, UserCheck, UserPlus, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePeopleStats } from "@/hooks/usePeopleList";

interface StatItem {
  key: string;
  label: string;
  value: number;
  icon: LucideIcon;
  bg: string;
  color: string;
}

/**
 * Cartões de resumo da aba Colaboradores (Total / Ativos / Novos / Áreas).
 *
 * Extraído do God component `HR.tsx`. Emojis (👥/✅/🆕/🏢) foram trocados por
 * ícones `lucide-react` e o loading passou de spinner inline para `Skeleton`.
 */
export function HRCollaboratorStats() {
  const { data: stats, isLoading, isError } = usePeopleStats();

  const items: StatItem[] = [
    { key: "total", label: "Total", value: stats?.total ?? 0, icon: Users, bg: "bg-primary/10", color: "text-primary" },
    { key: "active", label: "Ativos", value: stats?.active ?? 0, icon: UserCheck, bg: "bg-success/10", color: "text-success" },
    { key: "new", label: "Novos este mês", value: stats?.newThisMonth ?? 0, icon: UserPlus, bg: "bg-accent/10", color: "text-accent" },
    { key: "departments", label: "Áreas", value: stats?.departments ?? 0, icon: Building2, bg: "bg-warning/10", color: "text-warning" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {items.map((item) => (
        <Card key={item.key}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{isError ? "—" : item.value}</p>
                )}
              </div>
              <div className={`h-10 w-10 rounded-lg ${item.bg} flex items-center justify-center`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
