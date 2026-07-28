import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/layout/AppLayout";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Loader2,
  Grid3X3,
  Eye,
  MoreVertical,
  Lock,
  Trash2,
  Archive,
  ArchiveRestore,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useNineBoxSnapshots,
  type NineBoxSnapshotRow,
} from "@/hooks/useNineBoxSnapshots";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { CreateSnapshotDialog } from "@/components/admin/nineBox/CreateSnapshotDialog";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  finalized: "Finalizado",
  archived: "Arquivado",
};

const STATUS_CLASS: Record<string, string> = {
  draft: "border-primary/40 text-primary",
  finalized: "border-success/40 text-success",
  archived: "border-muted-foreground/40 text-muted-foreground",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy", { locale: ptBR });
  } catch {
    return value;
  }
}

export default function NineBoxPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: permsLoading } = useRequireAdmin({
    message: "Sem permissão para gerenciar Nine Box.",
  });
  const {
    snapshots,
    isLoading,
    createSnapshot,
    finalizeSnapshot,
    archiveSnapshot,
    unarchiveSnapshot,
    deleteSnapshot,
  } = useNineBoxSnapshots();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NineBoxSnapshotRow | null>(null);


  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const handleCreate = async (values: Parameters<typeof createSnapshot.mutateAsync>[0]) => {
    const result = await createSnapshot.mutateAsync(values);
    setCreateOpen(false);
    navigate(`/admin/nine-box/${result.snapshotId}`);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-4 py-2">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Grid3X3 className="h-6 w-6" />
              Nine Box
            </h1>
            <p className="text-sm text-muted-foreground">
              Calibração de performance × potencial. Crie snapshots por ciclo e arraste
              colaboradores na matriz 3×3.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo snapshot
          </Button>
        </header>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : snapshots.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Grid3X3 className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Nenhum snapshot ainda. Clique em "Novo snapshot" para começar.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Ciclo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Placements</TableHead>
                    <TableHead className="hidden md:table-cell">Criado por</TableHead>
                    <TableHead className="hidden md:table-cell">Criado</TableHead>
                    <TableHead className="w-32 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {s.cycle_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("font-normal", STATUS_CLASS[s.status])}>
                          {STATUS_LABEL[s.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{s.placement_count}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {s.creator_name ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatDate(s.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/admin/nine-box/${s.id}`)}
                            title="Abrir editor"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {s.status === "draft" && (
                                <DropdownMenuItem onClick={() => finalizeSnapshot.mutate(s.id)}>
                                  <Lock className="mr-2 h-4 w-4" />
                                  Finalizar
                                </DropdownMenuItem>
                              )}
                              {s.status === "finalized" && (
                                <DropdownMenuItem onClick={() => archiveSnapshot.mutate(s.id)}>
                                  <Archive className="mr-2 h-4 w-4" />
                                  Arquivar
                                </DropdownMenuItem>
                              )}
                              {s.status === "archived" && (
                                <DropdownMenuItem onClick={() => unarchiveSnapshot.mutate(s.id)}>
                                  <ArchiveRestore className="mr-2 h-4 w-4" />
                                  Reabrir como rascunho
                                </DropdownMenuItem>
                              )}
                              {s.status === "draft" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteTarget(s)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remover
                                  </DropdownMenuItem>
                                </>
                              )}
                              {s.status === "finalized" && s.finalized_at && (
                                <DropdownMenuItem disabled>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Finalizado em {formatDate(s.finalized_at)}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <CreateSnapshotDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isSubmitting={createSnapshot.isPending}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" e todos os {deleteTarget?.placement_count ?? 0}{" "}
              placements serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteSnapshot.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
