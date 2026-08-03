import { AppLayout } from "@/components/layout/AppLayout";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PulseWidget } from "@/components/dashboard/PulseWidget";
import { EvaluationWidget } from "@/components/dashboard/EvaluationWidget";
import { MyDayPanel } from "@/components/dashboard/MyDayPanel";
import { TeamPanel } from "@/components/dashboard/TeamPanel";
import { CompanyOverview } from "@/components/dashboard/CompanyOverview";
import { BirthdaysWidget } from "@/components/dashboard/BirthdaysWidget";
import { TopRecognizedWidget } from "@/components/dashboard/TopRecognizedWidget";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { useEffect, useRef } from "react";
import { useUser } from "@/hooks/useUser";
import { useIsManager } from "@/hooks/useIsManager";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useDriverTour } from "@/hooks/useDriverTour";
import { ONBOARDING_TOUR_ID, onboardingSteps } from "@/lib/tours";

/**
 * Home por papel (Onda 3 — §3.2, padrão nº1 do benchmark).
 *
 * - Colaborador (todos): "Meu Dia" — pulse ativo + check-ins pendentes, próxima
 *   1:1, feedbacks a responder e reconhecimentos recentes; mais um bloco leve de
 *   comunidade (aniversariantes / top reconhecidos).
 * - Gestor/Admin: além do "Meu Dia", ganham o "Painel do Time" (estilo Mural do
 *   Gestor / My Team Dashboard) e a "Visão da empresa" (dashboard da Onda 2).
 *   Decisão do lead: admin === gestor na Home (sem 3ª variante).
 */
const Index = () => {
  const { profile } = useUser();
  const { isManager, isLoading: isManagerLoading } = useIsManager();
  const { isAdmin, isLoading: permsLoading } = useUserPermissions();

  const roleLoading = isManagerLoading || permsLoading;
  const showTeamView = isManager || isAdmin;

  // Tour de primeiro acesso do colaborador (§3.7): menu por papel + check-in +
  // Pulse. Auto-start UMA vez a partir da Home (flag `tour:onboarding:v1`).
  // Espera o papel carregar para que os grupos do menu já estejam renderizados,
  // e dá um respiro para os widgets assíncronos (MyDay/Pulse) montarem. Passos
  // com alvo ausente são pulados — o tour nunca bloqueia a Home.
  const onboardingTour = useDriverTour(ONBOARDING_TOUR_ID, onboardingSteps);
  const onboardingStarted = useRef(false);
  useEffect(() => {
    if (onboardingStarted.current || roleLoading) return;
    onboardingStarted.current = true;
    const t = window.setTimeout(() => onboardingTour.start(), 600);
    return () => window.clearTimeout(t);
  }, [roleLoading, onboardingTour]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const userName = profile?.full_name?.split(" ")[0] || "";

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Boas-vindas */}
        <PageHeader
          className="mb-0"
          title={`${getGreeting()}${userName ? `, ${userName}` : ""}! 👋`}
          description="Aqui está o que precisa da sua atenção."
        />

        {/* Ações rápidas */}
        <QuickActions />

        {/* Pulse ativo — self-hides quando não há pulse pendente. */}
        <EvaluationWidget />

        <PulseWidget />

        {/* MEU DIA — visão do colaborador (todos os papéis). */}
        <MyDayPanel />

        {/* Bloco por papel */}
        {roleLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : showTeamView ? (
          <>
            <TeamPanel />
            <CompanyOverview />
          </>
        ) : (
          <section className="space-y-4" aria-label="Comunidade">
            <div>
              <h2 className="text-base font-semibold">Comunidade</h2>
              <p className="text-sm text-muted-foreground">
                O que está rolando pela empresa.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-5">
                  <TopRecognizedWidget />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <BirthdaysWidget />
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
