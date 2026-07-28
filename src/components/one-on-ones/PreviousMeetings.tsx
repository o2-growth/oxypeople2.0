import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ONE_ON_ONE_STATUS } from "@/components/shared/StatusBadge";
import { Loader2, Clock, FileText, BookOpen, Lock, History } from "lucide-react";
import { usePreviousMeetings } from "@/hooks/useOneOnOneHistory";

interface Props {
  oneOnOneId: string;
  leaderId: string;
  memberId: string;
  counterpartName: string;
}

export function PreviousMeetings({ oneOnOneId, leaderId, memberId, counterpartName }: Props) {
  const navigate = useNavigate();
  const { data: items = [], isLoading } = usePreviousMeetings(oneOnOneId, leaderId, memberId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 flex items-center gap-1.5">
        <History className="h-3.5 w-3.5" />
        Anteriores com {counterpartName}
      </h3>
      <div className="space-y-1">
        {items.map((row) => {
          const status = ONE_ON_ONE_STATUS[row.status];
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => navigate(`/one-on-ones/${row.id}`)}
              className="w-full text-left rounded-md px-3 py-2.5 hover:bg-muted/40 transition-colors space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {format(parseISO(row.scheduled_at), "dd MMM yyyy", { locale: ptBR })}
                </span>
                {status && (
                  <Badge variant={status.variant} className="text-[10px] py-0">
                    {status.label}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {row.topicCount} tópico{row.topicCount !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {row.sharedNoteCount} nota{row.sharedNoteCount !== 1 ? "s" : ""}
                </span>
                {row.myPrivateNoteCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Lock className="h-3 w-3" />
                    {row.myPrivateNoteCount} priv.
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
