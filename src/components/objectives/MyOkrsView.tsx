import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/QueryError";
import { CheckinDialog } from "@/components/objectives/CheckinDialog";
import { CheckinStreak } from "@/components/objectives/CheckinStreak";
import { Target, Building2, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useObjectives } from "@/hooks/useObjectives";
import { useCheckins, useOkrSettings } from "@/hooks/useCheckins";
import { useOkrTier } from "@/hooks/useOkrTier";
import { useAuth } from "@/contexts/AuthContext";
import { collectMyKrs, krProgress, DEFAULT_CHECKIN_OVERDUE_DAYS, type MyKr } from "@/lib/my-okrs";

/** Um KR meu: título, contexto, barra, valor→meta, streak e check-in em 1 clique. */
function MyKrCard({ item, canCheckin }: { item: MyKr; canCheckin: boolean }) {
  const [showCheckin, setShowCheckin] = useState(false);
  const { kr, objectiveTitle, teamName, pending } = item;
  // Reuso do hook existente (leve, por KR) para alimentar o streak/último check-in.
  const { data: checkins = [] } = useCheckins(kr.id);
  const pct = krProgress(kr);
  const done = pct >= 100;

  return (
    <>
      <Card className={cn("overflow-hidden", pending && "border-warning/40")}>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start gap-2">
              {done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" title={kr.title}>{kr.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {objectiveTitle}
                  {teamName ? <span> · {teamName}</span> : null}
                </p>
              </div>
              {pending && (
                <Badge variant="outline" className="ml-auto shrink-0 border-warning/40 bg-warning/10 text-warning">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Check-in pendente
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Progress value={pct} className="h-2 flex-1" />
              <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums">{pct}%</span>
              <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                {Number(kr.current_value)} / {Number(kr.target_value)} {kr.unit || ""}
              </span>
            </div>

            <CheckinStreak checkins={checkins} lastCheckinAt={kr.last_checkin_at} />
          </div>

          {canCheckin && (
            <Button
              variant={pending ? "default" : "outline"}
              size="sm"
              className="shrink-0 gap-1.5 sm:self-center"
              onClick={() => setShowCheckin(true)}
            >
              <TrendingUp className="h-4 w-4" />
              Fazer check-in
            </Button>
          )}
        </CardContent>
      </Card>

      {showCheckin && (
        <CheckinDialog
          open={showCheckin}
          onOpenChange={setShowCheckin}
          keyResult={{
            id: kr.id,
            title: kr.title,
            current_value: Number(kr.current_value),
            target_value: Number(kr.target_value),
            initial_value: Number(kr.initial_value),
            unit: kr.unit,
            objective_id: kr.objective_id,
          }}
        />
      )}
    </>
  );
}

/** Título de seção (Precisam de check-in / Em dia). */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

interface MyOkrsViewProps {
  /** Leva o usuário à visão "Empresa" (usado no estado vazio). */
  onGoToCompany: () => void;
}

/**
 * "Meus OKRs" — a visão PESSOAL (padrão Lattice/15Five): os key results de que
 * o usuário é dono, com os pendentes de check-in no topo e o check-in em um
 * clique (abre o `CheckinDialog` existente, sem navegar). Empty state honesto
 * com CTA para a visão "Empresa".
 */
export function MyOkrsView({ onGoToCompany }: MyOkrsViewProps) {
  const { user } = useAuth();
  const { data: objectives = [], isLoading, isError, refetch } = useObjectives();
  const { data: settings } = useOkrSettings();
  const { canCheckin } = useOkrTier();

  const overdueDays = settings?.checkin_overdue_days ?? DEFAULT_CHECKIN_OVERDUE_DAYS;
  const myKrs = useMemo<MyKr[]>(
    () => collectMyKrs(objectives, user?.id, overdueDays, Date.now()),
    [objectives, user?.id, overdueDays],
  );

  if (isError) {
    return (
      <QueryError
        message="Não foi possível carregar os seus OKRs."
        onRetry={() => refetch()}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
      </div>
    );
  }

  if (myKrs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Target className="h-6 w-6 text-primary" />
          </span>
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Você ainda não é dono de nenhum key result</h3>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Quando um KR for atribuído a você, ele aparece aqui com o check-in a um
              clique. Enquanto isso, acompanhe os OKRs da empresa.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={onGoToCompany}>
            <Building2 className="h-4 w-4" />
            Ver OKRs da empresa
          </Button>
        </CardContent>
      </Card>
    );
  }

  const pending = myKrs.filter((k) => k.pending);
  const upToDate = myKrs.filter((k) => !k.pending);

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section className="space-y-2">
          <SectionLabel>Precisam de check-in ({pending.length})</SectionLabel>
          <div className="space-y-3">
            {pending.map((item) => (
              <MyKrCard key={item.kr.id} item={item} canCheckin={canCheckin} />
            ))}
          </div>
        </section>
      )}

      {upToDate.length > 0 && (
        <section className="space-y-2">
          <SectionLabel>Em dia ({upToDate.length})</SectionLabel>
          <div className="space-y-3">
            {upToDate.map((item) => (
              <MyKrCard key={item.kr.id} item={item} canCheckin={canCheckin} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
