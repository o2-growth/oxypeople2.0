import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Bell, Clock, Loader2, Play, Siren } from "lucide-react";
import { toast } from "sonner";
import { useOkrEscalation, type OkrEscalationReport } from "@/hooks/useOkrEscalation";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

interface RunHistoryEntry {
  ranAt: Date;
  durationMs: number;
  totalCompanies: number;
  totalAtRisk: number;
  totalNotificationsCreated: number;
  hasErrors: boolean;
}

export default function OkrEscalationPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: permsLoading } = useRequireAdmin({
    message: "Sem permissão para acessar escalação automática.",
  });
  const escalation = useOkrEscalation();

  const [history, setHistory] = useState<RunHistoryEntry[]>([]);
  const [lastReport, setLastReport] = useState<OkrEscalationReport | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);


  const handleRun = async () => {
    setLastError(null);
    try {
      const response = await escalation.mutateAsync();
      setLastReport(response.data);
      setHistory((prev) =>
        [
          {
            ranAt: new Date(),
            durationMs: response.data.durationMs,
            totalCompanies: response.data.totalCompanies,
            totalAtRisk: response.data.totalAtRisk,
            totalNotificationsCreated: response.data.totalNotificationsCreated,
            hasErrors: !response.success,
          },
          ...prev,
        ].slice(0, 7),
      );
      if (response.error) setLastError(response.error);
    } catch (err) {
      setLastError((err as Error).message);
    }
  };

  const totalErrorsInLastRun = useMemo(() => {
    if (!lastReport) return 0;
    return lastReport.perCompany.reduce((acc, c) => acc + c.errors.length, 0);
  }, [lastReport]);

  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Siren className="h-6 w-6" />
            Escalação automática de OKRs
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Notifica owners e líderes quando objetivos estão em risco ou atrasados.
          </p>
        </div>

        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Cron diário pendente</AlertTitle>
          <AlertDescription>
            O job <code className="px-1 rounded bg-muted">okr-escalation-daily</code> entra no ar
            quando a migration <code className="px-1 rounded bg-muted">0009_pg_cron_jobs.sql</code>
            for aplicada. Por enquanto, dispare manualmente via "Rodar agora".
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disparo manual</CardTitle>
            <CardDescription>
              Roda a edge function <code>okr-escalation</code> em todas as empresas e cria
              notificações para objetivos com status auto-calculado em risco/atrasado.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button onClick={handleRun} disabled={escalation.isPending} className="gap-2">
              {escalation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {escalation.isPending ? "Executando..." : "Rodar agora"}
            </Button>
            {lastReport && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  {lastReport.totalCompanies} empresas
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  {lastReport.totalObjectivesScanned} objetivos
                </Badge>
                <Badge variant="default" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {lastReport.totalAtRisk} em risco
                </Badge>
                <Badge variant="default" className="gap-1">
                  <Bell className="h-3 w-3" />
                  {lastReport.totalNotificationsCreated} notificações
                </Badge>
                <Badge variant="outline">{lastReport.durationMs} ms</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {lastError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro na última execução</AlertTitle>
            <AlertDescription>{lastError}</AlertDescription>
          </Alert>
        )}

        {lastReport && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhe por empresa</CardTitle>
              <CardDescription>
                {totalErrorsInLastRun > 0
                  ? `${totalErrorsInLastRun} erros encontrados — empresas com erro mantêm o resto da execução intacta.`
                  : "Todas as empresas processadas sem erro."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lastReport.perCompany.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma empresa retornada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="text-right">Escaneados</TableHead>
                      <TableHead className="text-right">Em risco</TableHead>
                      <TableHead className="text-right">Notificações</TableHead>
                      <TableHead>Erros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lastReport.perCompany.map((c) => (
                      <TableRow key={c.companyId}>
                        <TableCell className="font-mono text-xs">{c.companyId.slice(0, 8)}…</TableCell>
                        <TableCell className="text-right">{c.objectivesScanned}</TableCell>
                        <TableCell className="text-right">{c.atRisk}</TableCell>
                        <TableCell className="text-right">{c.notificationsCreated}</TableCell>
                        <TableCell>
                          {c.errors.length === 0 ? (
                            <Badge variant="outline">ok</Badge>
                          ) : (
                            <Badge variant="destructive">{c.errors.length}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas execuções nesta sessão</CardTitle>
            <CardDescription>
              Histórico em memória (até a página ser recarregada). Quando o cron entrar, esta
              tabela passa a mostrar as 7 últimas runs persistidas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma execução nesta sessão. Clique em "Rodar agora" para começar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                    <TableHead className="text-right">Empresas</TableHead>
                    <TableHead className="text-right">Em risco</TableHead>
                    <TableHead className="text-right">Notificações</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{format(entry.ranAt, "HH:mm:ss")}</TableCell>
                      <TableCell className="text-right">{entry.durationMs} ms</TableCell>
                      <TableCell className="text-right">{entry.totalCompanies}</TableCell>
                      <TableCell className="text-right">{entry.totalAtRisk}</TableCell>
                      <TableCell className="text-right">{entry.totalNotificationsCreated}</TableCell>
                      <TableCell>
                        {entry.hasErrors ? (
                          <Badge variant="destructive">erros</Badge>
                        ) : (
                          <Badge variant="outline">ok</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
