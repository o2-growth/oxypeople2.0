import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { Send, Trash2, Eye, Loader2, MessageSquareQuote, Plus } from "lucide-react";
import {
  useFeedbackSent,
  type FeedbackSentRow,
  type FeedbackSentStatusFilter,
} from "@/hooks/useFeedbackSent";
import { useDeleteFeedbackRequest } from "@/hooks/useDeleteFeedbackRequest";
import { FeedbackStatusBadge } from "@/components/feedback/FeedbackStatusBadge";
import { FeedbackVisibilityBadge } from "@/components/feedback/FeedbackVisibilityBadge";
import { UserCell } from "@/components/feedback/UserCell";

export default function FeedbackSentPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FeedbackSentStatusFilter>("all");
  const { data: items, isLoading } = useFeedbackSent(filter);
  const deleteReq = useDeleteFeedbackRequest();
  const [deleteTarget, setDeleteTarget] = useState<FeedbackSentRow | null>(null);

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-4 py-2">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Send className="h-6 w-6" />
              Pedidos enviados
            </h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe o status dos feedbacks que você pediu.
            </p>
          </div>
          <Button onClick={() => navigate("/feedback/new")} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo pedido
          </Button>
        </header>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as FeedbackSentStatusFilter)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="requested">Pendentes</TabsTrigger>
            <TabsTrigger value="answered">Respondidos</TabsTrigger>
            <TabsTrigger value="declined">Recusados</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (items ?? []).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <MessageSquareQuote className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Nenhum pedido neste filtro.
                </p>
              </div>
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
                  {(items ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <UserCell user={row.respondent} />
                      </TableCell>
                      <TableCell>
                        <UserCell user={row.subject} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[260px]">
                        <span className="text-sm truncate block" title={row.question}>
                          {row.question.length > 100
                            ? `${row.question.slice(0, 100)}...`
                            : row.question}
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
      </div>

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
    </AppLayout>
  );
}
