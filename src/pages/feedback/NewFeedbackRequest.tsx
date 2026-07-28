import { useNavigate, useSearchParams } from "react-router-dom";
import { FeedbackRequestForm } from "@/components/feedback/FeedbackRequestForm";

/**
 * Corpo da aba "Pedir" da página unificada de Feedback (Onda 3, Lote F §3.1).
 * Sem AppLayout/PageHeader próprios — renderizado dentro do shell tabbed de
 * `Feedback.tsx`. Preserva o preset de assunto via `?subject=` e, ao concluir,
 * leva o usuário para a aba "Enviados".
 */
export default function NewFeedbackRequestBody() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetSubject = params.get("subject") ?? undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <FeedbackRequestForm
        presetSubjectId={presetSubject}
        onSuccess={() => navigate("/feedback?tab=enviados")}
      />
    </div>
  );
}
