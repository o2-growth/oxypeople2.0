import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { usePeriodsAdmin, type PeriodAdminRow } from "@/hooks/usePeriodsAdmin";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { PeriodFormDialog } from "@/components/admin/periods/PeriodFormDialog";

function formatPeriodDate(value: string): string {
  try {
    return format(new Date(`${value}T00:00:00`), "dd MMM yyyy", { locale: ptBR });
  } catch {
    return value;
  }
}

export default function PeriodsAdminPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: permsLoading } = useRequireAdmin({
    message: "Sem permissão para gerenciar períodos.",
  });
  const { periods, isLoading, createPeriod, updatePeriod, deletePeriod } = usePeriodsAdmin();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PeriodAdminRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PeriodAdminRow | null>(null);


  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (row: PeriodAdminRow) => {
    setEditTarget(row);
    setFormOpen(true);
  };

  const handleSubmit = async (values: { name: string; start_date: string; end_date: string }) => {
    if (editTarget) {
      await updatePeriod.mutateAsync({ ...values, id: editTarget.id });
    } else {
      await createPeriod.mutateAsync(values);
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deletePeriod.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarRange className="h-6 w-6" />
              Períodos
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Ciclos de OKR (trimestres, semestres, anos). Sobreposições são bloqueadas pelo banco.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo período
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lista de períodos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : periods.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Nenhum período cadastrado. Clique em "Novo período" para criar o primeiro.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Objetivos</TableHead>
                    <TableHead className="w-32 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{formatPeriodDate(p.start_date)}</TableCell>
                      <TableCell>{formatPeriodDate(p.end_date)}</TableCell>
                      <TableCell>
                        <Badge variant={p.objective_count > 0 ? "secondary" : "outline"}>
                          {p.objective_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      <PeriodFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValue={editTarget}
        onSubmit={handleSubmit}
        isSubmitting={createPeriod.isPending || updatePeriod.isPending}
        existingPeriods={periods}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover período?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.objective_count
                ? `${deleteTarget.objective_count} objetivos estão vinculados a "${deleteTarget?.name}". O banco vai bloquear a remoção.`
                : `O período "${deleteTarget?.name}" será removido permanentemente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
