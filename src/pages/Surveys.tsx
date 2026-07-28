import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Award } from "lucide-react";
import { CreateNPSSurveyCard } from "@/components/surveys/CreateNPSSurveyCard";
import { NPSSurveyCard } from "@/components/surveys/NPSSurveyCard";
import { NPSResponseDialog } from "@/components/surveys/NPSResponseDialog";
import { CreateGPTWSurveyCard } from "@/components/surveys/CreateGPTWSurveyCard";
import { GPTWSurveyCard } from "@/components/surveys/GPTWSurveyCard";
import { GPTWResponseDialog } from "@/components/surveys/GPTWResponseDialog";
import { SurveyTab } from "@/components/surveys/SurveyTab";
import {
  useNPSSurveys,
  useActiveNPSSurveys,
  useMyNPSResponses,
  NPSSurvey,
} from "@/hooks/useNPSSurveys";
import {
  useGPTWSurveys,
  useActiveGPTWSurveys,
  useMyGPTWResponses,
  useGPTWSurveyResponses,
  GPTWSurvey,
  calculateGPTWMetrics,
} from "@/hooks/useGPTWSurveys";
import { useUserPermissions } from "@/hooks/useUserPermissions";

/** Elemento das respostas do usuário (linha da resposta + pesquisa embutida), tipado a partir do hook. */
type MyNPSResponse = NonNullable<ReturnType<typeof useMyNPSResponses>["data"]>[number];
type MyGPTWResponse = NonNullable<ReturnType<typeof useMyGPTWResponses>["data"]>[number];

function ENPSTab() {
  const { isAdmin, isLoading: permissionsLoading } = useUserPermissions();
  const allSurveys = useNPSSurveys();
  const activeSurveys = useActiveNPSSurveys();
  const myResponses = useMyNPSResponses();
  const navigate = useNavigate();

  return (
    <SurveyTab<NPSSurvey, MyNPSResponse>
      icon={BarChart3}
      isAdmin={isAdmin}
      permissionsLoading={permissionsLoading}
      allSurveys={allSurveys}
      activeSurveys={activeSurveys}
      myResponses={myResponses}
      labels={{
        createdSectionTitle: "Pesquisas e-NPS Criadas",
        myResponsesSectionTitle: "Minhas Respostas NPS",
        emptyTitle: "Nenhuma pesquisa e-NPS no momento",
        emptyDescription:
          "Quando o RH publicar uma pesquisa e-NPS direcionada a você, ela aparecerá aqui para resposta.",
      }}
      renderCreate={() => <CreateNPSSurveyCard />}
      renderActiveCard={(survey, onRespond) => (
        <NPSSurveyCard survey={survey} onRespond={onRespond} hasResponded={false} />
      )}
      renderAdminCard={(survey) => (
        <NPSSurveyCard survey={survey} showAdminActions onViewResults={() => navigate("/hr")} />
      )}
      renderResponseCard={(response) => (
        <NPSSurveyCard survey={response.survey} hasResponded />
      )}
      renderResponseDialog={({ survey, open, onOpenChange }) => (
        <NPSResponseDialog survey={survey} open={open} onOpenChange={onOpenChange} />
      )}
    />
  );
}

function GPTWTab() {
  const { isAdmin, isLoading: permissionsLoading } = useUserPermissions();
  const allSurveys = useGPTWSurveys();
  const activeSurveys = useActiveGPTWSurveys();
  const myResponses = useMyGPTWResponses();

  return (
    <SurveyTab<GPTWSurvey, MyGPTWResponse>
      icon={Award}
      isAdmin={isAdmin}
      permissionsLoading={permissionsLoading}
      allSurveys={allSurveys}
      activeSurveys={activeSurveys}
      myResponses={myResponses}
      labels={{
        createdSectionTitle: "Pesquisas GPTW Criadas",
        myResponsesSectionTitle: "Minhas Respostas GPTW",
        emptyTitle: "Nenhuma pesquisa GPTW no momento",
        emptyDescription:
          "Quando o RH publicar uma pesquisa GPTW direcionada a você, ela aparecerá aqui para resposta.",
      }}
      renderCreate={() => <CreateGPTWSurveyCard />}
      renderActiveCard={(survey, onRespond) => (
        <GPTWSurveyCard survey={survey} onRespond={onRespond} hasResponded={false} />
      )}
      renderAdminCard={(survey) => <GPTWSurveyCardWithMetrics survey={survey} />}
      renderResponseCard={(response) => (
        <GPTWSurveyCard survey={response.survey} hasResponded />
      )}
      renderResponseDialog={({ survey, open, onOpenChange }) => (
        <GPTWResponseDialog survey={survey} open={open} onOpenChange={onOpenChange} />
      )}
    />
  );
}

/**
 * Card de pesquisa GPTW (admin) que busca as respostas e calcula as métricas.
 * A lógica de cálculo (`calculateGPTWMetrics`) permanece no hook — aqui só
 * conectamos o resultado ao card.
 */
function GPTWSurveyCardWithMetrics({ survey }: { survey: GPTWSurvey }) {
  const { data: responses } = useGPTWSurveyResponses(survey.id);
  const metrics = responses ? calculateGPTWMetrics(responses) : undefined;
  return <GPTWSurveyCard survey={survey} showAdminActions metrics={metrics} />;
}

export default function Surveys() {
  const { isAdmin } = useUserPermissions();

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Pesquisas"
          description={
            isAdmin
              ? "Crie pesquisas e acompanhe os resultados"
              : "Participe das pesquisas e acompanhe suas respostas"
          }
        />

        <Tabs defaultValue="enps" className="w-full">
          <TabsList>
            <TabsTrigger value="enps" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              e-NPS
            </TabsTrigger>
            <TabsTrigger value="gptw" className="gap-1.5">
              <Award className="h-4 w-4" />
              GPTW
            </TabsTrigger>
          </TabsList>

          <TabsContent value="enps" className="mt-6">
            <ENPSTab />
          </TabsContent>

          <TabsContent value="gptw" className="mt-6">
            <GPTWTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
