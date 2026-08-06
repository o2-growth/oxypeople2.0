import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Clock, CheckCircle, AlertCircle, Bell } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PerformanceEvaluation, EvaluationStatus } from "@/hooks/useEvaluations";
import type { PerformanceCycle } from "@/hooks/usePerformanceCycles";

interface EvaluationsListProps {
  evaluations: PerformanceEvaluation[];
  cycles: PerformanceCycle[];
  onViewEvaluation?: (evaluation: PerformanceEvaluation) => void;
  onSendReminder?: (evaluation: PerformanceEvaluation) => void;
  /** Cobra de uma vez todo mundo que ainda deve no ciclo filtrado. */
  onRemindAll?: (cycleId: string) => void;
  isReminding?: boolean;
}

// Tokens semânticos em vez de paleta crua: `bg-amber-100` não muda no tema
// escuro e virava um bloco claro berrante no meio da tabela.
const statusConfig: Record<EvaluationStatus, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: "Pendente", icon: Clock, className: "text-warning bg-warning/10 border-warning/20" },
  in_progress: { label: "Em andamento", icon: AlertCircle, className: "text-primary bg-primary/10 border-primary/20" },
  completed: { label: "Concluída", icon: CheckCircle, className: "text-success bg-success/10 border-success/20" },
  expired: { label: "Expirada", icon: AlertCircle, className: "text-destructive bg-destructive/10 border-destructive/20" },
};

export function EvaluationsList({
  evaluations,
  cycles,
  onViewEvaluation,
  onSendReminder,
  onRemindAll,
  isReminding,
}: EvaluationsListProps) {
  const [search, setSearch] = useState("");
  const [cycleFilter, setCycleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredEvaluations = evaluations.filter((evaluation) => {
    const matchesSearch =
      evaluation.evaluator?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      evaluation.evaluated?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCycle = cycleFilter === "all" || evaluation.cycle_id === cycleFilter;
    const matchesStatus = statusFilter === "all" || evaluation.status === statusFilter;
    return matchesSearch && matchesCycle && matchesStatus;
  });

  // Conta sobre o ciclo escolhido, não sobre a busca: cobrar é uma ação sobre o
  // ciclo inteiro, e o número teria que bater com o que a cobrança vai fazer.
  const pendentesNoFiltro = evaluations.filter(
    (e) =>
      (cycleFilter === "all" || e.cycle_id === cycleFilter) &&
      (e.status === "pending" || e.status === "in_progress"),
  ).length;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Avaliações</CardTitle>
            {pendentesNoFiltro > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {pendentesNoFiltro} {pendentesNoFiltro === 1 ? "pessoa ainda deve" : "ainda não respondidas"}
                {cycleFilter === "all" && " — filtre por ciclo para cobrar de uma vez"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onRemindAll && cycleFilter !== "all" && pendentesNoFiltro > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={isReminding}
                onClick={() => onRemindAll(cycleFilter)}
              >
                <Bell className="h-3.5 w-3.5" />
                Cobrar {pendentesNoFiltro} pendente{pendentesNoFiltro === 1 ? "" : "s"}
              </Button>
            )}
            <div className="relative w-full sm:w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={cycleFilter} onValueChange={setCycleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Ciclo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os ciclos</SelectItem>
                {cycles.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="expired">Expirada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Avaliador</TableHead>
              <TableHead>Avaliado</TableHead>
              <TableHead>Ciclo</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvaluations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma avaliação encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredEvaluations.map((evaluation) => {
                const status = statusConfig[evaluation.status];
                const StatusIcon = status.icon;
                return (
                  <TableRow key={evaluation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={evaluation.evaluator?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(evaluation.evaluator?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {evaluation.evaluator?.full_name || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={evaluation.evaluated?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(evaluation.evaluated?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {evaluation.evaluated?.full_name || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {evaluation.cycle?.name || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(evaluation.due_date), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {evaluation.overall_score
                        ? evaluation.overall_score.toFixed(1)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(evaluation.status === "pending" || evaluation.status === "in_progress") &&
                          onSendReminder && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              disabled={isReminding}
                              onClick={() => onSendReminder(evaluation)}
                            >
                              <Bell className="h-3.5 w-3.5" />
                              Cobrar
                            </Button>
                          )}
                        {/* Sem `onViewEvaluation` o botão não aparece: antes ele
                            existia sempre e não fazia nada ao ser clicado. */}
                        {onViewEvaluation && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewEvaluation(evaluation)}
                          >
                            Ver
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
