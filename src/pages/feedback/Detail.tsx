import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, ShieldOff, MessageSquare, BookOpen } from "lucide-react";
import { useFeedbackDetail } from "@/hooks/useFeedbackDetail";
import { FeedbackStatusBadge } from "@/components/feedback/FeedbackStatusBadge";
import { FeedbackVisibilityBadge } from "@/components/feedback/FeedbackVisibilityBadge";
import { UserCell } from "@/components/feedback/UserCell";
import { CreatePDIActionFromFeedback } from "@/components/feedback/CreatePDIActionFromFeedback";
import { useAuth } from "@/contexts/AuthContext";

function formatDate(v: string | null) {
  if (!v) return "—";
  try {
    return format(parseISO(v), "dd MMM yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return v;
  }
}

export default function FeedbackDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useFeedbackDetail(id);
  const { user } = useAuth();
  const [pdiDialogOpen, setPdiDialogOpen] = useState(false);

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-1.5 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        {isLoading ? (
          <Card>
            <CardContent className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : error || !data ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <ShieldOff className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Feedback não encontrado ou sem permissão</p>
                <p className="text-xs text-muted-foreground">
                  Pedidos privados ao requester não são visíveis para outras pessoas.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/feedback/sent")}>
                Voltar para pedidos enviados
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-5 w-5" />
                  Feedback
                </CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  <FeedbackStatusBadge status={data.status} />
                  <FeedbackVisibilityBadge visibility={data.visibility} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <DetailField label="Pedido por">
                  <UserCell user={data.requester} />
                </DetailField>
                <DetailField label="Respondente">
                  <UserCell user={data.respondent} />
                </DetailField>
                <DetailField label="Sobre">
                  <UserCell user={data.subject} />
                </DetailField>
              </div>

              <div className="rounded-md bg-muted/40 p-4">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Pergunta</p>
                <p className="text-sm whitespace-pre-line leading-relaxed">{data.question}</p>
              </div>

              {data.competency_tags.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Competências
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.competency_tags.map((t) => (
                      <Badge key={t} variant="secondary" className="font-normal">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {data.status === "answered" && data.response && (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-medium text-emerald-600">Resposta</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(data.answered_at)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-line leading-relaxed">{data.response}</p>
                </div>
              )}

              {data.status === "declined" && data.declined_reason && (
                <div className="rounded-md border border-muted-foreground/30 bg-muted/40 p-4">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Motivo da recusa</p>
                  <p className="text-sm italic text-muted-foreground">{data.declined_reason}</p>
                </div>
              )}

              {data.status === "requested" && data.due_date && (
                <p className="text-xs text-muted-foreground">
                  Prazo: <strong>{formatDate(data.due_date)}</strong>
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Pedido criado em {formatDate(data.created_at)}.
              </p>

              {data.status === "answered" && (
                <div className="pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setPdiDialogOpen(true)}
                  >
                    <BookOpen className="h-4 w-4" />
                    Criar ação no PDI
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {data && (
        <CreatePDIActionFromFeedback
          feedback={data}
          currentUserId={user?.id ?? ""}
          open={pdiDialogOpen}
          onOpenChange={setPdiDialogOpen}
        />
      )}
    </AppLayout>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
