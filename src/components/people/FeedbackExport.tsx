import { OnboardingFeedback } from "@/hooks/useOnboardingFeedback";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const integrationLevelLabels: Record<string, string> = {
  sim_totalmente: "Sim, totalmente",
  sim_em_parte: "Sim, em parte",
  nao_muito: "Não muito",
  nao: "Não",
};

const clarityLevelLabels: Record<string, string> = {
  sim: "Sim",
  em_parte: "Em parte",
  nao: "Não",
};

export function exportFeedbackToCSV(feedbacks: OnboardingFeedback[]) {
  const headers = [
    "Nome",
    "Email",
    "Data de Início",
    "Data de Resposta",
    "Status",
    "Avaliação Geral",
    "Surpresa Positiva",
    "Integração com o Time",
    "Tem Todos os Acessos",
    "Acessos Faltantes",
    "Facilidade das Ferramentas",
    "Treinamento",
    "Clareza das Responsabilidades",
    "Dificuldades",
    "Ferramentas Complicadas",
    "Avaliação do Onboarding",
    "O que Funcionou Bem",
    "Sugestões de Melhoria",
    "Dúvidas Pendentes",
    "Sentimento Geral",
    "Comentários Adicionais",
  ];

  const rows = feedbacks.map((feedback) => [
    feedback.user?.full_name || "",
    feedback.user?.email || "",
    feedback.created_at
      ? format(new Date(feedback.created_at), "dd/MM/yyyy", { locale: ptBR })
      : "",
    feedback.completed_at
      ? format(new Date(feedback.completed_at), "dd/MM/yyyy", { locale: ptBR })
      : "",
    feedback.status === "completed"
      ? "Completo"
      : feedback.status === "pending"
      ? "Pendente"
      : "Expirado",
    feedback.overall_rating?.toString() || "",
    feedback.positive_surprise || "",
    feedback.integration_level
      ? integrationLevelLabels[feedback.integration_level] || feedback.integration_level
      : "",
    feedback.has_all_access ? "Sim" : feedback.has_all_access === false ? "Não" : "",
    feedback.missing_access || "",
    feedback.tools_ease_rating?.toString() || "",
    feedback.training_rating?.toString() || "",
    feedback.clarity_level
      ? clarityLevelLabels[feedback.clarity_level] || feedback.clarity_level
      : "",
    feedback.difficulties || "",
    feedback.complicated_tools || "",
    feedback.onboarding_rating?.toString() || "",
    feedback.what_worked_well || "",
    feedback.improvement_suggestions || "",
    feedback.pending_questions || "",
    feedback.overall_feeling || "",
    feedback.additional_comments || "",
  ]);

  // Escape CSV values
  const escapeCSV = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\n");

  // Add BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `feedback-30-dias-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSingleFeedbackToCSV(feedback: OnboardingFeedback) {
  exportFeedbackToCSV([feedback]);
}
