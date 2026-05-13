import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCheck, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  approvedAt: string | null;
  approvalRequestedAt: string | null;
  managerName?: string | null;
}

export function ApprovalBadge({ approvedAt, approvalRequestedAt, managerName }: Props) {
  if (approvedAt) {
    const dateStr = format(parseISO(approvedAt), "d MMM yyyy", { locale: ptBR });
    return (
      <Badge variant="secondary" className="gap-1.5 text-green-700 bg-green-100 border-green-200">
        <CheckCheck className="h-3 w-3" />
        Aprovado em {dateStr}{managerName ? ` por ${managerName}` : ""}
      </Badge>
    );
  }

  if (approvalRequestedAt) {
    return (
      <Badge variant="outline" className="gap-1.5 text-amber-700 bg-amber-50 border-amber-200">
        <Clock className="h-3 w-3" />
        Aprovação pendente
      </Badge>
    );
  }

  return null;
}
