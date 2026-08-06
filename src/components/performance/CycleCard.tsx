import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal, Play, CheckCircle, Trash2, Edit, Users, CalendarDays, ChevronRight, Clock,
} from "lucide-react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TextoFormatado } from "@/components/ui/texto-formatado";
import type { PerformanceCycle, PerformanceCycleStatus, PerformanceCycleType } from "@/hooks/usePerformanceCycles";

interface CycleCardProps {
  cycle: PerformanceCycle;
  evaluationsCount: number;
  completedCount: number;
  participantsCount?: number;
  onActivate?: () => void;
  onComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Abre o detalhe do ciclo. Sem isto o card não é clicável. */
  onOpen?: () => void;
}

const statusConfig: Record<
  PerformanceCycleStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; dot: string }
> = {
  draft: { label: "Rascunho", variant: "secondary", dot: "bg-muted-foreground" },
  scheduled: { label: "Agendado", variant: "outline", dot: "bg-blue-500" },
  active: { label: "Em andamento", variant: "default", dot: "bg-emerald-500" },
  completed: { label: "Concluído", variant: "outline", dot: "bg-muted-foreground" },
  cancelled: { label: "Cancelado", variant: "destructive", dot: "bg-destructive" },
};

const typeLabels: Record<PerformanceCycleType, string> = {
  full: "Full",
  pocket: "Pocket",
  self: "Autoavaliação",
  "180": "180°",
  "360": "360°",
  leader: "Líder",
  custom: "Personalizado",
};

/** O que o tipo produz, em uma linha — evita ter que decorar a sigla. */
const typeSummary: Record<PerformanceCycleType, string> = {
  full: "Cada um se avalia, avalia seu gestor e é avaliado por ele",
  pocket: "Só o gestor avalia cada liderado",
  self: "Cada pessoa avalia a si mesma",
  "180": "Autoavaliação e avaliação do gestor",
  "360": "Auto, gestor, pares e liderados",
  leader: "Cada pessoa avalia quem a lidera",
  custom: "Configuração livre",
};

export function CycleCard({
  cycle,
  evaluationsCount,
  completedCount,
  participantsCount,
  onActivate,
  onComplete,
  onEdit,
  onDelete,
  onOpen,
}: CycleCardProps) {
  const status = statusConfig[cycle.status];
  const progress = evaluationsCount > 0 ? Math.round((completedCount / evaluationsCount) * 100) : 0;

  const fim = parseISO(cycle.end_date);
  // O contador cobra o prazo de responder, não o fim do processo: calibragem e
  // devolutivas vêm depois e não são trabalho de quem recebe o card.
  const prazo = parseISO(cycle.response_deadline ?? cycle.end_date);
  const diasRestantes = differenceInCalendarDays(prazo, new Date());
  const emAndamento = cycle.status === "active";
  const atrasado = emAndamento && diasRestantes < 0;

  const prazoTexto = !emAndamento
    ? null
    : atrasado
      ? `Prazo encerrado há ${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) === 1 ? "" : "s"}`
      : diasRestantes === 0
        ? "Último dia para responder"
        : `Faltam ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"} para responder`;

  return (
    <Card
      onClick={onOpen}
      className={cn(
        "border shadow-sm transition-all",
        onOpen && "cursor-pointer hover:border-primary/40 hover:shadow-md",
        emAndamento && "border-l-4 border-l-emerald-500",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold leading-tight">{cycle.name}</h3>
              <Badge variant="outline" className="shrink-0 text-xs">{typeLabels[cycle.type]}</Badge>
              <Badge variant={status.variant} className="shrink-0 gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                {status.label}
              </Badge>
            </div>

            {/* Sem line-clamp: a descrição é o que explica o ciclo para quem vai
                responder — cortá-la esconde justamente o contexto. */}
            <TextoFormatado className="text-sm text-muted-foreground">
              {cycle.description?.trim() || typeSummary[cycle.type]}
            </TextoFormatado>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {/* Ação principal fora do menu: iniciar era o passo mais importante
                e estava escondido atrás de "...". */}
            {cycle.status === "draft" && onActivate && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={(e) => { e.stopPropagation(); onActivate(); }}
              >
                <Play className="h-3.5 w-3.5" />
                Iniciar
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {cycle.status === "draft" && onActivate && (
                  <DropdownMenuItem onClick={onActivate}>
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar ciclo
                  </DropdownMenuItem>
                )}
                {cycle.status === "active" && onComplete && (
                  <DropdownMenuItem onClick={onComplete}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Finalizar ciclo
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {format(parseISO(cycle.start_date), "dd MMM", { locale: ptBR })} –{" "}
            {format(fim, "dd MMM yyyy", { locale: ptBR })}
          </span>
          {participantsCount != null && participantsCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {participantsCount} {participantsCount === 1 ? "pessoa" : "pessoas"}
            </span>
          )}
          {prazoTexto && (
            <span className={cn("flex items-center gap-1.5", atrasado && "font-medium text-destructive")}>
              <Clock className="h-3.5 w-3.5" />
              {prazoTexto}
            </span>
          )}
        </div>

        {evaluationsCount > 0 ? (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {completedCount} de {evaluationsCount} avaliações respondidas
              </span>
              <span className="font-medium tabular-nums">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        ) : (
          cycle.status === "active" && (
            <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Nenhuma avaliação gerada neste ciclo.
            </p>
          )
        )}

        {onOpen && (
          <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
            Ver detalhes e acompanhar
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
