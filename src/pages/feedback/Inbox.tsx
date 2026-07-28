import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Inbox as InboxIcon } from "lucide-react";
import {
  useFeedbackInbox,
  type FeedbackInboxFilter,
  type FeedbackInboxRow,
} from "@/hooks/useFeedbackInbox";
import { FeedbackInboxItem } from "@/components/feedback/FeedbackInboxItem";
import { RespondDialog } from "@/components/feedback/RespondDialog";
import { DeclineDialog } from "@/components/feedback/DeclineDialog";

export default function FeedbackInboxPage() {
  const [filter, setFilter] = useState<FeedbackInboxFilter>("pending");
  const { data: items, isLoading } = useFeedbackInbox(filter);

  const [respondTarget, setRespondTarget] = useState<FeedbackInboxRow | null>(null);
  const [declineTarget, setDeclineTarget] = useState<FeedbackInboxRow | null>(null);

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-4 py-2">
        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <InboxIcon className="h-6 w-6" />
            Inbox de feedback
          </h1>
          <p className="text-sm text-muted-foreground">
            Pedidos de feedback enviados para você responder.
          </p>
        </header>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as FeedbackInboxFilter)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="overdue">Atrasados</TabsTrigger>
            <TabsTrigger value="answered">Respondidos</TabsTrigger>
            <TabsTrigger value="declined">Recusados</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (items ?? []).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <InboxIcon className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {filter === "pending"
                    ? "Nenhum feedback pendente. Bom trabalho!"
                    : filter === "overdue"
                      ? "Sem pedidos atrasados."
                      : filter === "answered"
                        ? "Você ainda não respondeu nenhum feedback."
                        : filter === "declined"
                          ? "Você ainda não recusou nenhum pedido."
                          : "Nenhum pedido de feedback recebido."}
                </p>
              </div>
            ) : (
              (items ?? []).map((item) => (
                <FeedbackInboxItem
                  key={item.id}
                  item={item}
                  onRespond={() => setRespondTarget(item)}
                  onDecline={() => setDeclineTarget(item)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <RespondDialog
        open={!!respondTarget}
        onOpenChange={(open) => !open && setRespondTarget(null)}
        item={respondTarget}
      />
      <DeclineDialog
        open={!!declineTarget}
        onOpenChange={(open) => !open && setDeclineTarget(null)}
        item={declineTarget}
      />
    </AppLayout>
  );
}
