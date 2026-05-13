import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Coffee, Clock, FileText, BookOpen, Lock } from "lucide-react";
import { useOneOnOneHistory } from "@/hooks/useOneOnOneHistory";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  completed: { label: "Concluída", variant: "secondary" },
  canceled: { label: "Cancelada", variant: "destructive" },
  no_show: { label: "Não realizada", variant: "outline" },
};

const ALL_STATUSES = ["completed", "canceled", "no_show"] as const;

function initialsOf(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

interface Props {
  currentUserId: string;
}

export function HistoryTab({ currentUserId }: Props) {
  const navigate = useNavigate();
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const { query, items, hasMore, loadMore } = useOneOnOneHistory(nameFilter, statusFilter);

  const toggleStatus = (s: string) =>
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_STATUSES.map((s) => {
            const badge = STATUS_BADGE[s];
            const active = statusFilter.includes(s);
            return (
              <Button
                key={s}
                size="sm"
                variant={active ? "default" : "outline"}
                className="h-9 text-xs"
                onClick={() => toggleStatus(s)}
              >
                {badge.label}
              </Button>
            );
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Coffee className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sem reuniões anteriores ainda.</p>
          <p className="text-xs mt-1">Suas 1:1s aparecerão aqui após concluídas.</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border rounded-lg border">
            {items.map((row) => {
              const counterpart =
                row.leader_id === currentUserId ? row.member : row.leader;
              const status = STATUS_BADGE[row.status];

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => navigate(`/one-on-ones/${row.id}`)}
                  className="flex items-start gap-3 p-4 w-full text-left hover:bg-muted/30 transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                    <AvatarImage src={counterpart?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {initialsOf(counterpart?.full_name ?? null)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {counterpart?.full_name ?? "Desconhecido"}
                      </span>
                      {status && (
                        <Badge variant={status.variant} className="text-xs py-0">
                          {status.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(row.scheduled_at), "dd MMM yyyy", { locale: ptBR })}
                        {" "}· {row.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {row.topicCount} tópico{row.topicCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {row.sharedNoteCount} nota{row.sharedNoteCount !== 1 ? "s" : ""} compartilhada{row.sharedNoteCount !== 1 ? "s" : ""}
                      </span>
                      {row.myPrivateNoteCount > 0 && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Lock className="h-3 w-3" />
                          {row.myPrivateNoteCount} privada{row.myPrivateNoteCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={loadMore}>
                Carregar mais
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
