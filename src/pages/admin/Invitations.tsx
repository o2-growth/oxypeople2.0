import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, RotateCcw, Send, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useInvitations, type PendingInvite } from "@/hooks/useInvitations";
import { useDepartmentsWithDetails } from "@/hooks/useDepartmentsManager";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

const DEPT_NONE_VALUE = "__none__";

function formatDateTime(value: string): string {
  try {
    return format(new Date(value), "dd MMM yyyy HH:mm", { locale: ptBR });
  } catch {
    return value;
  }
}

export default function InvitationsAdminPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: permsLoading } = useRequireAdmin({
    message: "Sem permissão para gerenciar convites.",
  });
  const { pendingInvites, isLoading, inviteUser, resendInvite, cancelInvite } = useInvitations();
  const { data: departments = [] } = useDepartmentsWithDetails();

  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [departmentId, setDepartmentId] = useState<string>(DEPT_NONE_VALUE);
  const [cancelTarget, setCancelTarget] = useState<PendingInvite | null>(null);


  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Informe um e-mail");
      return;
    }
    try {
      await inviteUser.mutateAsync({
        email,
        position: position.trim() || null,
        departmentId: departmentId === DEPT_NONE_VALUE ? null : departmentId,
      });
      setEmail("");
      setPosition("");
      setDepartmentId(DEPT_NONE_VALUE);
    } catch {
      // toast handled in hook
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    await cancelInvite.mutateAsync(cancelTarget.id);
    setCancelTarget(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            Convidar colaborador
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Envie um convite por e-mail. O colaborador recebe link mágico para criar a senha e
            entra como membro da empresa.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo convite</CardTitle>
            <CardDescription>
              Cargo e área são opcionais — você pode editar depois em /hr.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">E-mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="pessoa@o2-growth.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={inviteUser.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-position">Cargo</Label>
                <Input
                  id="invite-position"
                  placeholder="Ex.: Analista de Growth"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  disabled={inviteUser.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-department">Área</Label>
                <Select
                  value={departmentId}
                  onValueChange={setDepartmentId}
                  disabled={inviteUser.isPending}
                >
                  <SelectTrigger id="invite-department">
                    <SelectValue placeholder="Sem área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEPT_NONE_VALUE}>Sem área</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={inviteUser.isPending} className="gap-2 w-full">
                  {inviteUser.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Convidar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Convites pendentes
            </CardTitle>
            <CardDescription>
              Pessoas convidadas que ainda não criaram a senha. Reenvie ou cancele a qualquer
              momento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : pendingInvites.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Nenhum convite pendente. Use o formulário acima para convidar a primeira pessoa.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Convidado em</TableHead>
                    <TableHead className="w-40 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        {inv.position ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {inv.department_name ? (
                          <Badge variant="secondary">{inv.department_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(inv.invited_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            disabled={resendInvite.isPending}
                            onClick={() => resendInvite.mutate(inv.id)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reenviar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-muted-foreground hover:text-destructive"
                            onClick={() => setCancelTarget(inv)}
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancelar
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

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar convite?</AlertDialogTitle>
            <AlertDialogDescription>
              O convite para <strong>{cancelTarget?.email}</strong> será removido. Se a pessoa
              tentar usar o link mágico, ainda funcionará no Auth, mas ela não será adicionada à
              empresa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
