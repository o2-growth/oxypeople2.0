import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock, Star, Users, User } from "lucide-react";
import { scaleLabel } from "@/lib/performance/values";
import { cn } from "@/lib/utils";

interface Recebida {
  id: string;
  relationship: string;
  status: string;
  overall_score: number | null;
  can_view: boolean;
  evaluator: { full_name: string | null; avatar_url: string | null } | null;
  cycle: { name: string } | null;
}

/**
 * Avaliações sobre a pessoa.
 *
 * A nota só chega preenchida quando a liberação já ocorreu — quem decide isso
 * é a RLS no banco, não esta tela. Aqui a única responsabilidade é explicar o
 * bloqueio em vez de mostrar um espaço vazio.
 */
function useMyResults() {
  const { profile } = useUser();
  const userId = profile?.id;

  return useQuery({
    queryKey: ["my-evaluation-results", userId],
    queryFn: async (): Promise<Recebida[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("performance_evaluations")
        .select(`
          id, relationship, status, overall_score,
          evaluator:users!performance_evaluations_evaluator_id_fkey(full_name, avatar_url),
          cycle:performance_cycles(name)
        `)
        .eq("evaluated_id", userId)
        .neq("evaluator_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // A checagem de liberação roda no banco: replicá-la aqui criaria uma
      // segunda regra para divergir da primeira.
      const comPermissao = await Promise.all(
        (data ?? []).map(async (e) => {
          const { data: pode } = await supabase.rpc("can_view_evaluation_result", {
            _evaluation_id: e.id,
            _user_id: userId,
          });
          return { ...e, can_view: !!pode } as unknown as Recebida;
        }),
      );
      return comPermissao;
    },
    enabled: !!userId,
  });
}

const ORIGEM: Record<string, { label: string; icon: typeof User }> = {
  manager: { label: "Do seu gestor", icon: User },
  subordinate: { label: "De quem você lidera", icon: Users },
  direct_report: { label: "De quem você lidera", icon: Users },
  peer: { label: "De um par", icon: Users },
};

export function MyResults() {
  const { data, isLoading } = useMyResults();

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent className="space-y-3">
          {[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}
        </CardContent>
      </Card>
    );
  }

  if (!data?.length) return null;

  const liberadas = data.filter((d) => d.can_view && d.overall_score != null);
  const media = liberadas.length
    ? liberadas.reduce((a, d) => a + (d.overall_score ?? 0), 0) / liberadas.length
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Avaliações sobre você</CardTitle>
            <CardDescription>O que outras pessoas responderam a seu respeito</CardDescription>
          </div>
          {media != null && (
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums">{media.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{scaleLabel(media)}</p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {data.map((r) => {
          const origem = ORIGEM[r.relationship] ?? { label: "Avaliação", icon: User };
          const Icon = origem.icon;
          const bloqueada = !r.can_view;

          return (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3",
                bloqueada && "bg-muted/30",
              )}
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={bloqueada ? undefined : r.evaluator?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {bloqueada ? <Lock className="h-3.5 w-3.5" /> : (r.evaluator?.full_name ?? "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {origem.label}
                  {!bloqueada && r.evaluator?.full_name && (
                    <span className="font-normal text-muted-foreground">
                      · {r.evaluator.full_name}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.cycle?.name}
                  {bloqueada && (
                    <>
                      {" · "}
                      {r.status === "completed"
                        ? "disponível quando quem avaliou concluir todas as avaliações dele"
                        : "ainda não respondida"}
                    </>
                  )}
                </p>
              </div>

              {bloqueada ? (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Lock className="h-3 w-3" />
                  Em sigilo
                </Badge>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold tabular-nums">
                    {r.overall_score?.toFixed(2) ?? "—"}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <p className="pt-1 text-xs text-muted-foreground">
          As notas ficam em sigilo até quem avaliou terminar todas as avaliações do ciclo —
          assim ninguém ajusta o que escreveu depois de ver a reação.
        </p>
      </CardContent>
    </Card>
  );
}
