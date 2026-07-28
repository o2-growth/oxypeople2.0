import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/lib/formatters";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Eye, ShieldCheck } from "lucide-react";
import { useFeedbackAboutMe, useFeedbackForTeam } from "@/hooks/useFeedbackAboutMe";
import { CompetencyStatsCard } from "@/components/feedback/CompetencyStatsCard";
import { FeedbackVisibilityBadge } from "@/components/feedback/FeedbackVisibilityBadge";
import { UserCell } from "@/components/feedback/UserCell";
import { trackEvent } from "@/lib/analytics";

type View = "me" | "team";

export default function FeedbackAboutMePage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("me");
  const meQuery = useFeedbackAboutMe();
  const teamQuery = useFeedbackForTeam();

  useEffect(() => {
    trackEvent("feedback_about_me_viewed", { view });
  }, [view]);

  const items = useMemo(
    () => (view === "me" ? meQuery.data ?? [] : teamQuery.data ?? []),
    [view, meQuery.data, teamQuery.data],
  );
  const isLoading = view === "me" ? meQuery.isLoading : teamQuery.isLoading;
  const showTeam = (teamQuery.data ?? []).length > 0;

  const stats = useMemo(
    () =>
      items.map((i) => ({
        competency_tags: i.competency_tags,
        answered_at: i.answered_at,
      })),
    [items],
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-4 py-2">
        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MessageSquare className="h-6 w-6" />
            Feedbacks sobre {view === "me" ? "mim" : "meu time"}
          </h1>
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-success" />
            Você só vê feedbacks que foram explicitamente compartilhados.
          </p>
        </header>

        {showTeam && (
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="me">Sobre mim</TabsTrigger>
              <TabsTrigger value="team">Sobre meu time</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            {isLoading ? (
              <Card>
                <CardContent className="flex justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : items.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {view === "me"
                      ? "Você ainda não recebeu feedbacks compartilhados."
                      : "Ninguém do seu time recebeu feedback compartilhado com gestor."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              items.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <CardTitle className="text-sm font-medium">
                          {view === "me" ? (
                            <span className="text-muted-foreground">
                              Pedido por <UserCellInline user={item.requester} />, respondido por{" "}
                              <UserCellInline user={item.respondent} />
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Sobre <UserCellInline user={item.subject} />, respondido por{" "}
                              <UserCellInline user={item.respondent} />
                            </span>
                          )}
                        </CardTitle>
                      </div>
                      <FeedbackVisibilityBadge visibility={item.visibility} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-md bg-muted/40 p-3">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Pergunta</p>
                      <p className="text-sm whitespace-pre-line">{item.question}</p>
                    </div>
                    {item.response && (
                      <div className="rounded-md border border-success/30 bg-success/5 p-3">
                        <p className="mb-1 text-xs font-medium text-success">Resposta</p>
                        <p className="text-sm whitespace-pre-line">{item.response}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {item.competency_tags.map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs font-normal">
                            {t}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.answered_at)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/feedback/${item.id}`)}
                          className="h-7 gap-1.5 px-2 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <aside className="space-y-3">
            <CompetencyStatsCard feedbacks={stats} />
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}

function UserCellInline({
  user,
}: {
  user: { id: string; full_name: string | null; avatar_url: string | null } | null;
}) {
  return (
    <span className="inline-flex items-center align-middle">
      <UserCell user={user} />
    </span>
  );
}
