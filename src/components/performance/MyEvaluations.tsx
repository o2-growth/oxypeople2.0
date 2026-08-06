import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Clock, CheckCircle, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PerformanceEvaluation } from "@/hooks/useEvaluations";
import { useAuth } from "@/contexts/AuthContext";

interface MyEvaluationsProps {
  pendingEvaluations: PerformanceEvaluation[];
  completedEvaluations: PerformanceEvaluation[];
  onStartEvaluation?: (evaluation: PerformanceEvaluation) => void;
  onViewResults?: (evaluation: PerformanceEvaluation) => void;
}

export function MyEvaluations({
  pendingEvaluations,
  completedEvaluations,
  onStartEvaluation,
  onViewResults,
}: MyEvaluationsProps) {
  const { user } = useAuth();

  const getEvaluationTitle = (evaluation: PerformanceEvaluation) => {
    if (evaluation.evaluator_id === evaluation.evaluated_id) {
      return "Autoavaliação";
    }
    if (evaluation.evaluator_id === user?.id) {
      return `Avaliar: ${evaluation.evaluated?.full_name || "Colaborador"}`;
    }
    return `Avaliação de: ${evaluation.evaluator?.full_name || "Colaborador"}`;
  };

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
    <div className="space-y-6">
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pendentes ({pendingEvaluations.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Histórico ({completedEvaluations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingEvaluations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">Nenhuma avaliação pendente</h3>
                <p className="text-muted-foreground">
                  Você não tem avaliações para responder no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingEvaluations.map((evaluation) => (
                <Card key={evaluation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={
                              evaluation.evaluator_id === user?.id
                                ? evaluation.evaluated?.avatar_url || undefined
                                : evaluation.evaluator?.avatar_url || undefined
                            }
                          />
                          <AvatarFallback>
                            {getInitials(
                              evaluation.evaluator_id === user?.id
                                ? evaluation.evaluated?.full_name
                                : evaluation.evaluator?.full_name
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h4 className="truncate font-medium">
                            {getEvaluationTitle(evaluation)}
                          </h4>
                          <p className="truncate text-sm text-muted-foreground">
                            {evaluation.cycle?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Prazo</p>
                          <p className="text-sm font-medium">
                            {format(new Date(evaluation.due_date), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => onStartEvaluation?.(evaluation)}
                        >
                          Responder
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {completedEvaluations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">Nenhuma avaliação concluída</h3>
                <p className="text-muted-foreground">
                  Seu histórico de avaliações aparecerá aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedEvaluations.map((evaluation) => (
                <Card key={evaluation.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={evaluation.evaluated?.avatar_url || undefined}
                          />
                          <AvatarFallback>
                            {getInitials(evaluation.evaluated?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h4 className="truncate font-medium">
                            {evaluation.cycle?.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {format(
                              new Date(evaluation.completed_at || evaluation.updated_at),
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {evaluation.overall_score && (
                          <div className="flex items-center gap-1 text-warning">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="font-medium">
                              {evaluation.overall_score.toFixed(1)}
                            </span>
                          </div>
                        )}
                        <Badge variant="secondary">Concluída</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewResults?.(evaluation)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
