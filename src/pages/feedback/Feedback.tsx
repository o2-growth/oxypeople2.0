import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MessageSquareQuote, Plus } from "lucide-react";
import FeedbackInboxBody from "./Inbox";
import NewFeedbackRequestBody from "./NewFeedbackRequest";
import FeedbackSentBody from "./Sent";
import FeedbackAboutMeBody from "./AboutMe";

/**
 * Página unificada de Feedback (Onda 3, Lote F §3.1).
 *
 * Consolida os 3 itens de menu antigos (Inbox / Pedir / Enviados) + "Sobre mim"
 * em uma única tela com abas internas controladas por `?tab=`. Os corpos de cada
 * aba são os componentes reaproveitados das telas originais (sem AppLayout nem
 * PageHeader duplicados) — cada um preserva seus próprios estados e filtros.
 *
 * Deep-links antigos são preservados via redirects em `App.tsx`:
 *  - /feedback/inbox     → /feedback?tab=inbox
 *  - /feedback/new       → /feedback?tab=pedir
 *  - /feedback/sent      → /feedback?tab=enviados
 *  - /feedback/about-me  → /feedback?tab=sobre-mim
 */
const TABS = ["inbox", "pedir", "enviados", "sobre-mim"] as const;
type TabKey = (typeof TABS)[number];

const TAB_DESCRIPTION: Record<TabKey, string> = {
  inbox: "Pedidos de feedback enviados para você responder.",
  pedir: "Peça um feedback para alguém do time.",
  enviados: "Acompanhe o status dos feedbacks que você pediu.",
  "sobre-mim": "Feedbacks que foram explicitamente compartilhados com você.",
};

function isTabKey(value: string | null): value is TabKey {
  return value !== null && (TABS as readonly string[]).includes(value);
}

export default function FeedbackPage() {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("tab");
  const tab: TabKey = isTabKey(rawTab) ? rawTab : "inbox";

  const setTab = (next: string) => {
    setParams(
      (prev) => {
        const merged = new URLSearchParams(prev);
        merged.set("tab", next);
        return merged;
      },
      { replace: true },
    );
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-4 py-2">
        <PageHeader
          title="Feedback"
          description={TAB_DESCRIPTION[tab]}
          icon={MessageSquareQuote}
          actions={
            tab !== "pedir" ? (
              <Button onClick={() => setTab("pedir")} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Novo pedido
              </Button>
            ) : undefined
          }
        />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="pedir">Pedir</TabsTrigger>
            <TabsTrigger value="enviados">Enviados</TabsTrigger>
            <TabsTrigger value="sobre-mim">Sobre mim</TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="mt-4">
            <FeedbackInboxBody />
          </TabsContent>
          <TabsContent value="pedir" className="mt-4">
            <NewFeedbackRequestBody />
          </TabsContent>
          <TabsContent value="enviados" className="mt-4">
            <FeedbackSentBody />
          </TabsContent>
          <TabsContent value="sobre-mim" className="mt-4">
            <FeedbackAboutMeBody />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
