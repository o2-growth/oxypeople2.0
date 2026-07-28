import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Award } from "lucide-react";
import { CreateNPSSurveyCard } from "@/components/surveys/CreateNPSSurveyCard";
import { NPSSurveyCard } from "@/components/surveys/NPSSurveyCard";
import { NPSResponseDialog } from "@/components/surveys/NPSResponseDialog";
import { CreateGPTWSurveyCard } from "@/components/surveys/CreateGPTWSurveyCard";
import { GPTWSurveyCard } from "@/components/surveys/GPTWSurveyCard";
import { GPTWResponseDialog } from "@/components/surveys/GPTWResponseDialog";
import {
  useNPSSurveys,
  useActiveNPSSurveys,
  useMyNPSResponses,
  NPSSurvey,
  calculateNPSMetrics,
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

function ENPSTab() {
  const [selectedSurvey, setSelectedSurvey] = useState<NPSSurvey | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const { isAdmin } = useUserPermissions();
  const { data: allNPSSurveys } = useNPSSurveys();
  const { data: activeSurveys } = useActiveNPSSurveys();
  const { data: myResponses } = useMyNPSResponses();

  const handleRespond = (survey: NPSSurvey) => {
    setSelectedSurvey(survey);
    setResponseDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {isAdmin && <CreateNPSSurveyCard />}

      {activeSurveys && activeSurveys.length > 0 && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Pesquisas Pendentes para Responder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeSurveys.map((survey) => (
                <NPSSurveyCard
                  key={survey.id}
                  survey={survey}
                  onRespond={() => handleRespond(survey)}
                  hasResponded={false}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && allNPSSurveys && allNPSSurveys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pesquisas e-NPS Criadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allNPSSurveys.map((survey) => (
                <NPSSurveyCard
                  key={survey.id}
                  survey={survey}
                  showAdminActions
                  onViewResults={() => (window.location.href = "/hr")}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isAdmin && myResponses && myResponses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Minhas Respostas NPS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myResponses.map((response: any) => (
                <NPSSurveyCard key={response.id} survey={response.survey} hasResponded />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <NPSResponseDialog
        survey={selectedSurvey}
        open={responseDialogOpen}
        onOpenChange={setResponseDialogOpen}
      />
    </div>
  );
}

function GPTWTab() {
  const [selectedSurvey, setSelectedSurvey] = useState<GPTWSurvey | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const { isAdmin } = useUserPermissions();
  const { data: allSurveys } = useGPTWSurveys();
  const { data: activeSurveys } = useActiveGPTWSurveys();
  const { data: myResponses } = useMyGPTWResponses();

  const handleRespond = (survey: GPTWSurvey) => {
    setSelectedSurvey(survey);
    setResponseDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {isAdmin && <CreateGPTWSurveyCard />}

      {activeSurveys && activeSurveys.length > 0 && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Pesquisas Pendentes para Responder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeSurveys.map((survey) => (
                <GPTWSurveyCard
                  key={survey.id}
                  survey={survey}
                  onRespond={() => handleRespond(survey)}
                  hasResponded={false}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && allSurveys && allSurveys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pesquisas GPTW Criadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allSurveys.map((survey) => (
                <GPTWSurveyCardWithMetrics key={survey.id} survey={survey} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isAdmin && myResponses && myResponses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Minhas Respostas GPTW</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myResponses.map((response: any) => (
                <GPTWSurveyCard key={response.id} survey={response.survey} hasResponded />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <GPTWResponseDialog
        survey={selectedSurvey}
        open={responseDialogOpen}
        onOpenChange={setResponseDialogOpen}
      />
    </div>
  );
}

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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pesquisas</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "Crie pesquisas e acompanhe os resultados"
              : "Participe das pesquisas e acompanhe suas respostas"}
          </p>
        </div>

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
