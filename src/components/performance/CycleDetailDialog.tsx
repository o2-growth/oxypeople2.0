import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Clock, CircleDashed } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TextoFormatado } from "@/components/ui/texto-formatado";
import type { PerformanceCycle } from "@/hooks/usePerformanceCycles";

const RELACAO: Record<string, string> = {
  self: "Autoavaliação",
  manager: "Avalia o liderado",
  subordinate: "Avalia o gestor",
  direct_report: "Avalia o gestor",
  peer: "Avalia um par",
};

interface Row {
  id: string;
  status: string;
  relationship: string;
  evaluator: { id: string; full_name: string | null; avatar_url: string | null } | null;
  evaluated: { id: string; full_name: string | null } | null;
}

/** Progresso do ciclo, por pessoa que precisa responder. */
function useCycleProgress(cycleId: string | null) {
  return useQuery({
    queryKey: ["cycle-progress", cycleId],
    queryFn: async (): Promise<Row[]> => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from("performance_evaluations")
        .select(`
          id, status, relationship,
          evaluator:users!performance_evaluations_evaluator_id_fkey(id, full_name, avatar_url),
          evaluated:users!performance_evaluations_evaluated_id_fkey(id, full_name)
        `)
        .eq("cycle_id", cycleId);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
    enabled: !!cycleId,
  });
}

interface CycleDetailDialogProps {
  cycle: PerformanceCycle | null;
  onOpenChange: (open: boolean) => void;
}

export function CycleDetailDialog({ cycle, onOpenChange }: CycleDetailDialogProps) {
  const { data: linhas, isLoading } = useCycleProgress(cycle?.id ?? null);

  // Agrupa por avaliador: o que interessa acompanhar é quem ainda não
  // respondeu, não a lista solta de avaliações.
  const porPessoa = useMemo(() => {
    const mapa = new Map<string, { nome: string; avatar: string | null; itens: Row[] }>();
    for (const l of linhas ?? []) {
      const id = l.evaluator?.id ?? "?";
      if (!mapa.has(id)) {
        mapa.set(id, { nome: l.evaluator?.full_name ?? "—", avatar: l.evaluator?.avatar_url ?? null, itens: [] });
      }
      mapa.get(id)!.itens.push(l);
    }
    return [...mapa.values()]
      .map((p) => {
        const feitas = p.itens.filter((i) => i.status === "completed").length;
        return { ...p, feitas, total: p.itens.length, pct: Math.round((feitas / p.itens.length) * 100) };
      })
      // quem menos respondeu primeiro: é quem precisa de cobrança
      .sort((a, b) => a.pct - b.pct || a.nome.localeCompare(b.nome));
  }, [linhas]);

  const total = linhas?.length ?? 0;
  const feitas = linhas?.filter((l) => l.status === "completed").length ?? 0;
  const pct = total ? Math.round((feitas / total) * 100) : 0;
  const concluiram = porPessoa.filter((p) => p.pct === 100).length;

  return (
    <Dialog open={!!cycle} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[620px]">
        {cycle && (
          <>
            <DialogHeader>
              <DialogTitle>{cycle.name}</DialogTitle>
              {/* Só as datas aqui. A descrição tem parágrafos e uma lista de
                  etapas: espremida na linha do subtítulo, virava um paredão. */}
              <DialogDescription>
                {format(parseISO(cycle.start_date), "dd MMM", { locale: ptBR })} –{" "}
                {format(parseISO(cycle.end_date), "dd MMM yyyy", { locale: ptBR })}
                {cycle.response_deadline && (
                  <> · respostas até{" "}
                    {format(parseISO(cycle.response_deadline), "dd 'de' MMMM", { locale: ptBR })}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {cycle.description?.trim() && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <TextoFormatado className="text-sm text-muted-foreground">
                  {cycle.description}
                </TextoFormatado>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 py-2">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold tabular-nums">{pct}%</p>
                <p className="text-xs text-muted-foreground">respondido</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold tabular-nums">{feitas}<span className="text-base font-normal text-muted-foreground">/{total}</span></p>
                <p className="text-xs text-muted-foreground">avaliações</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold tabular-nums">{concluiram}<span className="text-base font-normal text-muted-foreground">/{porPessoa.length}</span></p>
                <p className="text-xs text-muted-foreground">pessoas em dia</p>
              </div>
            </div>

            <Progress value={pct} className="h-2" />

            <div className="mt-2 space-y-1">
              <p className="mb-2 text-sm font-medium">
                Quem ainda precisa responder
                <span className="ml-1.5 font-normal text-muted-foreground">
                  — em ordem de pendência
                </span>
              </p>

              {isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}

              {!isLoading && porPessoa.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma avaliação neste ciclo.
                </p>
              )}

              {porPessoa.map((p) => (
                <div
                  key={p.nome}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3",
                    p.pct === 100 && "bg-muted/30",
                  )}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={p.avatar ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {p.nome.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.nome}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.itens.map((i) => (
                        <Badge
                          key={i.id}
                          variant={i.status === "completed" ? "secondary" : "outline"}
                          className="gap-1 text-[11px] font-normal"
                        >
                          {i.status === "completed" ? (
                            <Check className="h-3 w-3" />
                          ) : i.status === "in_progress" ? (
                            <Clock className="h-3 w-3" />
                          ) : (
                            <CircleDashed className="h-3 w-3" />
                          )}
                          {RELACAO[i.relationship] ?? i.relationship}
                          {i.relationship !== "self" && i.evaluated?.full_name
                            ? `: ${i.evaluated.full_name.split(" ")[0]}`
                            : ""}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <span
                    className={cn(
                      "shrink-0 text-sm font-medium tabular-nums",
                      p.pct === 100 ? "text-emerald-600" : "text-muted-foreground",
                    )}
                  >
                    {p.feitas}/{p.total}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
