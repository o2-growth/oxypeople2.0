import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { differenceInCalendarDays, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Pendente {
  id: string;
  relationship: string;
  status: string;
  due_date: string;
  cycle: { id: string; name: string; end_date: string } | null;
  evaluated: { full_name: string | null } | null;
}

/** Avaliações que a pessoa precisa responder no ciclo ativo. */
function useMyPendingEvaluations() {
  const { profile } = useUser();
  const userId = profile?.id;

  return useQuery({
    queryKey: ["my-pending-evaluations", userId],
    queryFn: async (): Promise<Pendente[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("performance_evaluations")
        .select(`
          id, relationship, status, due_date,
          cycle:performance_cycles!inner(id, name, end_date, status),
          evaluated:users!performance_evaluations_evaluated_id_fkey(full_name)
        `)
        .eq("evaluator_id", userId)
        .eq("cycle.status", "active")
        .order("due_date");
      if (error) throw error;
      return (data ?? []) as unknown as Pendente[];
    },
    enabled: !!userId,
  });
}

export function EvaluationWidget() {
  const navigate = useNavigate();
  const { data: todas, isLoading } = useMyPendingEvaluations();

  if (isLoading || !todas?.length) return null;

  const pendentes = todas.filter((e) => e.status !== "completed");
  const feitas = todas.length - pendentes.length;
  const progresso = Math.round((feitas / todas.length) * 100);
  const ciclo = todas[0].cycle;

  const dias = ciclo ? differenceInCalendarDays(parseISO(ciclo.end_date), new Date()) : null;
  const urgente = dias != null && dias <= 3;

  // Tudo respondido: confirma e sai do caminho, em vez de continuar cobrando.
  if (pendentes.length === 0) {
    return (
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Avaliações concluídas</p>
            <p className="text-xs text-muted-foreground">
              Você respondeu as {todas.length} do ciclo {ciclo?.name}. Obrigado!
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/performance")}>
            Ver
          </Button>
        </CardContent>
      </Card>
    );
  }

  const auto = pendentes.filter((e) => e.relationship === "self").length;
  const sobreGestor = pendentes.filter(
    (e) => e.relationship === "subordinate" || e.relationship === "direct_report",
  );
  const sobreLiderados = pendentes.filter((e) => e.relationship === "manager");

  return (
    <Card
      data-tour="evaluation"
      className={cn(
        "border-l-4",
        urgente
          ? "border-l-destructive border-destructive/30 bg-gradient-to-br from-destructive/5 to-transparent"
          : "border-l-primary border-primary/30 bg-gradient-to-br from-primary/5 to-transparent",
      )}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <ClipboardCheck
            className={cn("mt-0.5 h-5 w-5 shrink-0", urgente ? "text-destructive" : "text-primary")}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">
                Você tem {pendentes.length} avaliaç{pendentes.length > 1 ? "ões" : "ão"} para responder
              </p>
              {dias != null && (
                <Badge variant={urgente ? "destructive" : "secondary"} className="gap-1">
                  <Clock className="h-3 w-3" />
                  {dias < 0
                    ? "prazo encerrado"
                    : dias === 0
                      ? "último dia"
                      : `${dias} dia${dias === 1 ? "" : "s"}`}
                </Badge>
              )}
            </div>

            <p className="mt-0.5 text-sm text-muted-foreground">
              {ciclo?.name}
              {ciclo && ` · até ${format(parseISO(ciclo.end_date), "dd 'de' MMMM", { locale: ptBR })}`}
            </p>

            {/* Diz o que é cada uma: "3 avaliações" sozinho não explica o que
                a pessoa vai encontrar do outro lado do botão. */}
            <ul className="mt-2.5 space-y-1 text-sm">
              {auto > 0 && (
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Sua autoavaliação
                </li>
              )}
              {sobreGestor.length > 0 && (
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Avaliar {sobreGestor[0].evaluated?.full_name?.split(" ")[0] ?? "seu gestor"}, que lidera você
                </li>
              )}
              {sobreLiderados.length > 0 && (
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Avaliar {sobreLiderados.length}{" "}
                  {sobreLiderados.length === 1 ? "pessoa do seu time" : "pessoas do seu time"}
                  <span className="text-muted-foreground">
                    ({sobreLiderados.slice(0, 3).map((e) => e.evaluated?.full_name?.split(" ")[0]).join(", ")}
                    {sobreLiderados.length > 3 && ` +${sobreLiderados.length - 3}`})
                  </span>
                </li>
              )}
            </ul>

            {feitas > 0 && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{feitas} de {todas.length} respondidas</span>
                  <span className="tabular-nums">{progresso}%</span>
                </div>
                <Progress value={progresso} className="h-1.5" />
              </div>
            )}

            <Button className="mt-3 gap-2" onClick={() => navigate("/performance")}>
              {feitas > 0 ? "Continuar" : "Começar"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
