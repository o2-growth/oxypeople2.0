import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/hooks/useUser";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PulseQuestion } from "@/components/pulse/PulseQuestion";
import { periodStartFor, pulseAckKey } from "@/lib/pulse/periodStart";
import type { PendingPulse } from "@/hooks/usePendingPulse";

export default function PulsePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { profile } = useUser();
  const [completed, setCompleted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["pulse-detail", id, user?.id],
    queryFn: async (): Promise<{ pulse: PendingPulse; alreadyResponded: boolean } | null> => {
      if (!id || !user?.id) return null;
      const { data: row, error: rowErr } = await supabase
        .from("pulse_surveys")
        .select(
          "id, question, question_type, frequency, day_of_week, day_of_month, anonymous, require_comment_below, active, created_at, company_id",
        )
        .eq("id", id)
        .maybeSingle();

      if (rowErr) throw rowErr;
      if (!row) return null;
      if (!row.active) return null;

      const periodStart = periodStartFor(
        new Date(),
        row.frequency as PendingPulse["frequency"],
        row.day_of_week,
        row.day_of_month,
        new Date(row.created_at),
      );

      let alreadyResponded = false;
      if (row.anonymous) {
        if (typeof window !== "undefined" && window.localStorage.getItem(pulseAckKey(row.id, periodStart))) {
          alreadyResponded = true;
        }
      } else {
        const { data: existing, error: checkErr } = await supabase
          .from("pulse_responses")
          .select("id")
          .eq("pulse_survey_id", row.id)
          .eq("user_id", user.id)
          .eq("period_start", periodStart)
          .maybeSingle();
        if (checkErr) throw checkErr;
        alreadyResponded = !!existing;
      }

      return {
        pulse: {
          id: row.id,
          question: row.question,
          question_type: row.question_type as PendingPulse["question_type"],
          frequency: row.frequency as PendingPulse["frequency"],
          anonymous: row.anonymous,
          require_comment_below: row.require_comment_below,
          period_start: periodStart,
          created_at: row.created_at,
        },
        alreadyResponded,
      };
    },
    enabled: !!id && !!user?.id && !!profile?.primary_company_id,
  });

  useEffect(() => {
    if (completed) {
      const t = setTimeout(() => {
        toast.success("Pulse respondido!");
        navigate("/", { replace: true });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [completed, navigate]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-xl py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-4 gap-1.5 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {completed || data?.alreadyResponded ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Pulse respondido
                </>
              ) : (
                <>
                  <Activity className="h-5 w-5 text-success" />
                  Pulse
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : error || !data ? (
              <div className="space-y-3 py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Esta pesquisa não existe ou não está mais ativa.
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate("/")}>
                  Ir para o início
                </Button>
              </div>
            ) : data.alreadyResponded || completed ? (
              <p className="text-sm text-muted-foreground">
                Você já respondeu este Pulse no período corrente. Obrigado!
              </p>
            ) : (
              <PulseQuestion pulse={data.pulse} onComplete={() => setCompleted(true)} />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
