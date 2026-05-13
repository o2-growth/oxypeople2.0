import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Clock } from "lucide-react";
import { useFeedbackCronStatus } from "@/hooks/useFeedbackCronStatus";

export function CronStatusCard() {
  const { forceExpire, lastRunCount, lastRunAt } = useFeedbackCronStatus();

  const nextRun = (() => {
    const d = new Date();
    d.setUTCHours(23, 0, 0, 0);
    if (d <= new Date()) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          Manutenção — expiração automática
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Próxima execução automática:</span>
          <Badge variant="outline">
            {format(nextRun, "dd/MM 'às' HH:mm", { locale: ptBR })} UTC
          </Badge>
        </div>

        {lastRunAt && (
          <p className="text-xs text-muted-foreground">
            Última manual: {format(lastRunAt, "dd/MM HH:mm", { locale: ptBR })} —{" "}
            <span className="font-medium">{lastRunCount} expirado{lastRunCount !== 1 ? "s" : ""}</span>
          </p>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={() => forceExpire.mutate()}
          disabled={forceExpire.isPending}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${forceExpire.isPending ? "animate-spin" : ""}`} />
          Forçar expiração agora
        </Button>
      </CardContent>
    </Card>
  );
}
