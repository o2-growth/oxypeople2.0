import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox as InboxIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/QueryError";
import {
  useFeedbackInbox,
  type FeedbackInboxFilter,
  type FeedbackInboxRow,
} from "@/hooks/useFeedbackInbox";
import { FeedbackInboxItem } from "@/components/feedback/FeedbackInboxItem";
import { RespondDialog } from "@/components/feedback/RespondDialog";
import { DeclineDialog } from "@/components/feedback/DeclineDialog";

/**
 * Título/descrição do estado vazio por filtro. Substitui o ternário aninhado
 * de 5 níveis por um mapa legível. O empty "Bom trabalho!" só é atingível
 * quando NÃO há erro (o fluxo de estados checa `isError` antes do vazio).
 */
const EMPTY_COPY: Record<FeedbackInboxFilter, { title: string; description?: string }> = {
  pending: {
    title: "Nenhum feedback pendente",
    description: "Bom trabalho! Você já respondeu tudo que estava na fila.",
  },
  overdue: { title: "Sem pedidos atrasados" },
  answered: { title: "Você ainda não respondeu nenhum feedback" },
  declined: { title: "Você ainda não recusou nenhum pedido" },
  all: { title: "Nenhum pedido de feedback recebido" },
};

/** Skeleton local da lista (o cabeçalho já está visível via PageHeader). */
function InboxListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

/**
 * Corpo da aba "Inbox" da página unificada de Feedback (Onda 3, Lote F §3.1).
 * Sem AppLayout/PageHeader próprios — é renderizado dentro do shell tabbed de
 * `Feedback.tsx`. Preserva os estados (loading/erro/vazio) e o filtro interno
 * que a Onda 2 introduziu nesta tela.
 */
export default function FeedbackInboxBody() {
  const [filter, setFilter] = useState<FeedbackInboxFilter>("pending");
  const { data: items, isLoading, isError, refetch } = useFeedbackInbox(filter);

  const [respondTarget, setRespondTarget] = useState<FeedbackInboxRow | null>(null);
  const [declineTarget, setDeclineTarget] = useState<FeedbackInboxRow | null>(null);

  const empty = EMPTY_COPY[filter];

  return (
    <>
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
            <InboxListSkeleton />
          ) : isError ? (
            <QueryError
              message="Não foi possível carregar seu inbox de feedback."
              onRetry={() => refetch()}
            />
          ) : !items?.length ? (
            <EmptyState
              icon={InboxIcon}
              title={empty.title}
              description={empty.description}
            />
          ) : (
            items.map((item) => (
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
    </>
  );
}
