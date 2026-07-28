import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/lib/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/QueryError";
import { Trash2, Eye, MessageSquareQuote } from "lucide-react";
import {
  useFeedbackSent,
  type FeedbackSentRow,
  type FeedbackSentStatusFilter,
} from "@/hooks/useFeedbackSent";
import { useDeleteFeedbackRequest } from "@/hooks/useDeleteFeedbackRequest";
import { FeedbackStatusBadge } from "@/components/feedback/FeedbackStatusBadge";
import { FeedbackVisibilityBadge } from "@/components/feedback/FeedbackVisibilityBadge";
import { UserCell } from "@/components/feedback/UserCell";

/** Skeleton local das linhas da tabela (cabeçalho já visível via PageHeader). */
function SentTableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  );
}

/**
 * Corpo da aba "Enviados" da página unificada de Feedback (Onda 3, Lote F §3.1).
 * Sem AppLayout/PageHeader próprios — renderizado dentro do shell tabbed de
 * `Feedback.tsx`. A ação "Novo pedido" agora vive no cabeçalho unificado e leva
 * à aba "Pedir" (`/feedback?tab=pedir`).
 */
export default function FeedbackSentBody() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FeedbackSentStatusFilter>("all");
  const { data: items, isLoading, isError, refetch } = useFeedbackSent(filter);
  const deleteReq = useDeleteFeedbackRequest();
  const [deleteTarget, setDeleteTarget] = useState<FeedbackSentRow | null>(null);

  return (
    <>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FeedbackSentStatusFilter)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="requested">Pendentes</TabsTrigger>
          <TabsTrigger value="answered">Respondidos</TabsTrigger>
          <TabsTrigger value="declined">Recusados</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="mt-4">
        <CardContent className="p-0">
          {isLoading ? (
            <SentTableSkeleton />
          ) : isError ? (
            <QueryError
              message="Não foi possível carregar seus pedidos de feedback."
              onRetry={() => refetch()}
            />
          ) : !items?.length ? (
            <EmptyState
              icon={MessageSquareQuote}
              title="Nenhum pedido neste filtro"
              description="Peça um feedback e acompanhe as respostas por aqui."
              action={{ label: "Novo pedido", onClick: () => navigate("/feedback?tab=pedir") }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Para</TableHead>
                  <TableHead>Sobre</TableHead>
                  <TableHead className="hidden md:table-cell">Pergunta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Visibilidade</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="hidden md:table-cell">Criado</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <UserCell user={row.respondent} />
                    </TableCell>
                    <TableCell>
                      <UserCell user={row.subject} />
                    </TableCell>
                    <TableCell className="hidden max-w-xs md:table-cell">
                      <span className="block truncate text-sm" title={row.question}>
                        {row.question}
                      </span>
                    </TableCell>
                    <TableCell>
                      <FeedbackStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <FeedbackVisibilityBadge visibility={row.visibility} />
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(row.due_date)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatDate(row.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/feedback/${row.id}`)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {row.status === "requested" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(row)}
                            title="Cancelar pedido"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              O pedido sobre "{deleteTarget?.subject?.full_name ?? "alguém"}" será removido.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteReq.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Cancelar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
