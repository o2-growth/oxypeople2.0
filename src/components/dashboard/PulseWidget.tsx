import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle2 } from "lucide-react";
import { usePendingPulse } from "@/hooks/usePendingPulse";
import { PulseQuestion } from "@/components/pulse/PulseQuestion";

export function PulseWidget() {
  const { data: pulse, isLoading } = usePendingPulse();
  const [completed, setCompleted] = useState(false);

  if (isLoading) return null;
  if (!pulse && !completed) return null;

  return (
    // data-tour: âncora do tour de onboarding (§3.7). Fica no card que só
    // renderiza quando há Pulse ativo — sem Pulse, o passo é pulado.
    <Card data-tour="pulse" className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {completed ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Resposta registrada
            </>
          ) : (
            <>
              <Activity className="h-5 w-5 text-emerald-500" />
              Pulse {pulse?.frequency === "monthly" ? "do mês" : "da semana"}
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pulse && !completed ? (
          <PulseQuestion pulse={pulse} onComplete={() => setCompleted(true)} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Obrigado por compartilhar como você está. Te vejo no próximo Pulse!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
