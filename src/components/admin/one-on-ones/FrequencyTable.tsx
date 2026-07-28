import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { LeaderStat, MeetingRow } from "@/hooks/useOneOnOnesDashboard";

// ─── Status label ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  completed: "Concluída",
  canceled: "Cancelada",
  no_show: "Não realizada",
};

function statusVariant(status: string): "secondary" | "outline" | "destructive" | "default" {
  switch (status) {
    case "completed":
      return "secondary";
    case "canceled":
    case "no_show":
      return "destructive";
    default:
      return "outline";
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  rows: LeaderStat[];
  allMeetings: MeetingRow[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FrequencyTable({ rows, allMeetings }: Props) {
  const [drillLeader, setDrillLeader] = useState<LeaderStat | null>(null);

  const leaderMeetings: MeetingRow[] = drillLeader
    ? allMeetings.filter((m) => m.leader_id === drillLeader.leader_id)
    : [];

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    try {
      return format(parseISO(dateStr), "dd MMM yyyy", { locale: ptBR });
    } catch {
      return "—";
    }
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gestor</TableHead>
              <TableHead className="text-right">Liderados</TableHead>
              <TableHead className="text-right">1:1s agendadas</TableHead>
              <TableHead className="text-right">1:1s completadas</TableHead>
              <TableHead className="text-right">% Conclusão</TableHead>
              <TableHead>Última 1:1</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Nenhum gestor encontrado no período selecionado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.leader_id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/40 transition-colors",
                    row.no_recent && "bg-yellow-50 dark:bg-yellow-950/20",
                  )}
                  onClick={() => setDrillLeader(row)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{row.leader_name}</span>
                      {row.no_recent && (
                        <Badge variant="outline" className="text-yellow-700 border-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700 shrink-0">
                          ⚠️ Sem 1:1 recente
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{row.direct_reports}</TableCell>
                  <TableCell className="text-right">{row.scheduled}</TableCell>
                  <TableCell className="text-right">{row.completed}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-semibold",
                        row.completion_pct >= 75
                          ? "text-green-600 dark:text-green-400"
                          : row.completion_pct >= 40
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {row.scheduled === 0 ? "—" : `${row.completion_pct}%`}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(row.last_meeting_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Drill-down Sheet — metadata only, NO notes or topics */}
      <Sheet open={!!drillLeader} onOpenChange={(open) => !open && setDrillLeader(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>1:1s de {drillLeader?.leader_name}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {leaderMeetings.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma 1:1 registrada para este gestor no período.
              </p>
            ) : (
              leaderMeetings
                .slice()
                .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
                .map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg border p-3 text-sm space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {formatDate(m.scheduled_at)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Com: {m.member?.full_name ?? "—"}
                        </p>
                      </div>
                      <Badge variant={statusVariant(m.status)} className="shrink-0">
                        {STATUS_LABEL[m.status] ?? m.status}
                      </Badge>
                    </div>
                  </div>
                ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
