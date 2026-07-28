import { Link } from "react-router-dom";
import { Target, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/QueryError";
import { ProgressBarStatus } from "@/components/objectives/ProgressBarStatus";
import { useObjectives } from "@/hooks/useObjectives";
import type { ObjectiveStatus } from "@/hooks/useObjectives";
import { cn } from "@/lib/utils";

/**
 * Rótulos/cores de status do objetivo — cópia local (não reutiliza o mapa do
 * `ObjectiveCard` de propósito, para manter a fronteira do §3.3 sem depender de
 * arquivos de outras ondas). Ver `ObjectiveStatus` em `useObjectives`.
 */
const STATUS_CONFIG: Record<ObjectiveStatus, { label: string; className: string }> = {
  planned: { label: "Planejado", className: "bg-muted text-muted-foreground" },
  active: { label: "Ativo", className: "bg-green-500/10 text-green-600 border-green-500/30" },
  risk: { label: "Em Risco", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  completed: { label: "Concluído", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  canceled: { label: "Cancelado", className: "bg-red-500/10 text-red-600 border-red-500/30" },
};

/** Ordem de exibição: o que está em jogo primeiro, encerrados por último. */
const STATUS_ORDER: Record<ObjectiveStatus, number> = {
  risk: 0,
  active: 1,
  planned: 2,
  completed: 3,
  canceled: 4,
};

interface LeaderObjectivesSectionProps {
  /** `member_id` da 1:1 — o liderado, dono dos objetivos exibidos. */
  memberId: string;
  /** Nome do liderado para o cabeçalho e estados vazios. */
  memberName: string;
}

/**
 * Seção read-only na tela da 1:1 com os objetivos do **liderado** (o "member").
 *
 * Compõe sobre o hook existente `useObjectives()` (query da empresa já cacheada,
 * com RLS aplicado) filtrando por `owner_id === memberId` — nenhuma query nova.
 * Objetivos do liderado que o usuário atual não pode ver (RLS) simplesmente não
 * voltam na lista; isso é estado vazio legítimo, não erro. Cada item leva ao
 * detalhe (`/objectives/:id`).
 */
export function LeaderObjectivesSection({ memberId, memberName }: LeaderObjectivesSectionProps) {
  const { data: objectives = [], isLoading, isError, refetch } = useObjectives();

  const firstName = memberName.split(" ")[0] || memberName;

  const memberObjectives = objectives
    .filter((o) => o.owner_id === memberId)
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 flex items-center gap-1.5">
        <Target className="h-3.5 w-3.5" />
        Objetivos de {firstName}
        {memberObjectives.length > 0 && (
          <span className="text-muted-foreground/70 normal-case font-normal">
            ({memberObjectives.length})
          </span>
        )}
      </h3>

      {isLoading ? (
        <div className="space-y-1.5" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <QueryError
          message="Não foi possível carregar os objetivos do liderado."
          onRetry={() => refetch()}
        />
      ) : memberObjectives.length === 0 ? (
        <div className="rounded-md border border-dashed px-3 py-6 text-center">
          <Target className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Nenhum objetivo visível de {firstName}.
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            Objetivos privados ou fora do seu acesso não aparecem aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-1">
          {memberObjectives.map((o) => {
            const status = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.planned;
            return (
              <li key={o.id}>
                <Link
                  to={`/objectives/${o.id}`}
                  className="group block rounded-md border px-3 py-2.5 hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate flex-1 min-w-0">
                      {o.title}
                    </span>
                    <Badge variant="outline" className={cn("shrink-0 text-[10px]", status.className)}>
                      {status.label}
                    </Badge>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div className="mt-2">
                    <ProgressBarStatus
                      value={o.progress}
                      expectedValue={o.expected_progress ?? undefined}
                      showValue
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
