import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Calendar as CalendarIcon,
  Clock,
  Target,
  CheckCircle2,
} from "lucide-react";
import type { ObjectiveWithDetails } from "@/hooks/useObjectives";
import { cn } from "@/lib/utils";

interface ObjectiveInfoCardsProps {
  objective: ObjectiveWithDetails;
  periodLabel: string;
  daysRemaining: number | null;
  checkinCount: number;
}

function InfoCard({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="stat-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Linha de cards de resumo do objetivo: responsável, período, dias restantes,
 * total de resultados-chave e de check-ins.
 */
export function ObjectiveInfoCards({
  objective,
  periodLabel,
  daysRemaining,
  checkinCount,
}: ObjectiveInfoCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <InfoCard label="Responsável" icon={<Users className="h-4 w-4 text-muted-foreground" />}>
        <div className="flex items-center gap-2 mt-1">
          {objective.owner && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={objective.owner.avatar_url || ""} />
              <AvatarFallback className="text-[9px]">
                {(objective.owner.full_name || objective.owner.email).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {objective.owner?.full_name || objective.owner?.email || "—"}
            </p>
          </div>
        </div>
      </InfoCard>

      <InfoCard label="Período" icon={<CalendarIcon className="h-4 w-4 text-muted-foreground" />}>
        <p className="text-sm font-medium mt-1">{periodLabel}</p>
      </InfoCard>

      <InfoCard label="Dias restantes" icon={<Clock className="h-4 w-4 text-muted-foreground" />}>
        <p
          className={cn(
            "text-lg font-bold mt-0.5",
            daysRemaining != null && daysRemaining < 0 && "text-destructive"
          )}
        >
          {daysRemaining != null
            ? daysRemaining >= 0
              ? `${daysRemaining} dias`
              : `${Math.abs(daysRemaining)}d atrasado`
            : "—"}
        </p>
      </InfoCard>

      <InfoCard label="Resultados chave" icon={<Target className="h-4 w-4 text-muted-foreground" />}>
        <p className="text-lg font-bold mt-0.5">{objective.key_results.length}</p>
      </InfoCard>

      <InfoCard label="Check-ins" icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}>
        <p className="text-lg font-bold mt-0.5">{checkinCount}</p>
      </InfoCard>
    </div>
  );
}
