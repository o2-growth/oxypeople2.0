import { Fragment, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/QueryError";

/** Contrato mínimo que qualquer pesquisa/resposta precisa cumprir (chave de lista). */
interface Identifiable {
  id: string;
}

interface SurveyTabLabels {
  /** Título da seção de pesquisas criadas (admin). Ex.: "Pesquisas e-NPS Criadas". */
  createdSectionTitle: string;
  /** Título da seção de respostas do colaborador. Ex.: "Minhas Respostas NPS". */
  myResponsesSectionTitle: string;
  /** Título do estado vazio (colaborador sem pesquisas). */
  emptyTitle: string;
  /** Orientação do estado vazio. */
  emptyDescription: string;
}

interface SurveyTabProps<TSurvey extends Identifiable, TResponse extends Identifiable> {
  /** Ícone do tipo de pesquisa (também usado no estado vazio). */
  icon: LucideIcon;
  /** Papel do usuário. */
  isAdmin: boolean;
  /** Verdadeiro enquanto o papel do usuário ainda carrega (evita empty/UI errada). */
  permissionsLoading?: boolean;
  /** Query de todas as pesquisas (visão admin). */
  allSurveys: UseQueryResult<TSurvey[]>;
  /** Query das pesquisas ativas pendentes de resposta. */
  activeSurveys: UseQueryResult<TSurvey[]>;
  /** Query das respostas do colaborador. */
  myResponses: UseQueryResult<TResponse[]>;
  labels: SurveyTabLabels;
  /** Card de criação de pesquisa (renderizado só para admin). */
  renderCreate: () => ReactNode;
  /** Card de uma pesquisa pendente; recebe o handler que abre o diálogo de resposta. */
  renderActiveCard: (survey: TSurvey, onRespond: () => void) => ReactNode;
  /** Card de uma pesquisa criada (visão admin, com resultados/ações). */
  renderAdminCard: (survey: TSurvey) => ReactNode;
  /** Card de uma resposta já enviada pelo colaborador. */
  renderResponseCard: (response: TResponse) => ReactNode;
  /** Diálogo de resposta, controlado pelo estado interno do tab. */
  renderResponseDialog: (args: {
    survey: TSurvey | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => ReactNode;
}

const gridClass = "grid gap-4 md:grid-cols-2 lg:grid-cols-3";

/**
 * Estrutura unificada de um tab de pesquisas (e-NPS, GPTW, ...).
 *
 * Concentra o padrão obrigatório de estados (loading → skeleton, erro →
 * `QueryError`, vazio → `EmptyState`) e o layout das seções (criar, pendentes,
 * criadas, minhas respostas) num único componente parametrizado. As diferenças
 * de cada pesquisa entram por render props, sem duplicar a casca. A lógica de
 * métricas/cálculo permanece nos hooks (`calculateNPSMetrics`/`calculateGPTWMetrics`).
 */
export function SurveyTab<TSurvey extends Identifiable, TResponse extends Identifiable>({
  icon: Icon,
  isAdmin,
  permissionsLoading = false,
  allSurveys,
  activeSurveys,
  myResponses,
  labels,
  renderCreate,
  renderActiveCard,
  renderAdminCard,
  renderResponseCard,
  renderResponseDialog,
}: SurveyTabProps<TSurvey, TResponse>) {
  const [selectedSurvey, setSelectedSurvey] = useState<TSurvey | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRespond = (survey: TSurvey) => {
    setSelectedSurvey(survey);
    setDialogOpen(true);
  };

  const isLoading =
    permissionsLoading ||
    activeSurveys.isLoading ||
    myResponses.isLoading ||
    (isAdmin && allSurveys.isLoading);

  const isError = activeSurveys.isError || myResponses.isError || allSurveys.isError;

  if (isLoading) {
    // Skeleton sem cabeçalho — o PageHeader de Surveys já cobre o título da página.
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <QueryError
        onRetry={() => {
          activeSurveys.refetch();
          myResponses.refetch();
          if (isAdmin) allSurveys.refetch();
        }}
      />
    );
  }

  const active = activeSurveys.data ?? [];
  const created = allSurveys.data ?? [];
  const responses = myResponses.data ?? [];

  // Colaborador sem pesquisas ativas nem respostas: estado vazio orientando.
  if (!isAdmin && active.length === 0 && responses.length === 0) {
    return (
      <EmptyState icon={Icon} title={labels.emptyTitle} description={labels.emptyDescription} />
    );
  }

  return (
    <div className="space-y-6">
      {isAdmin && renderCreate()}

      {active.length > 0 && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              Pesquisas Pendentes para Responder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={gridClass}>
              {active.map((survey) => (
                <Fragment key={survey.id}>
                  {renderActiveCard(survey, () => handleRespond(survey))}
                </Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && created.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{labels.createdSectionTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={gridClass}>
              {created.map((survey) => (
                <Fragment key={survey.id}>{renderAdminCard(survey)}</Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isAdmin && responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{labels.myResponsesSectionTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={gridClass}>
              {responses.map((response) => (
                <Fragment key={response.id}>{renderResponseCard(response)}</Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {renderResponseDialog({
        survey: selectedSurvey,
        open: dialogOpen,
        onOpenChange: setDialogOpen,
      })}
    </div>
  );
}
