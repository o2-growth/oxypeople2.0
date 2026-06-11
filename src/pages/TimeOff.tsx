import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Palmtree, Plus, Trash2, Settings2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { usePeopleList } from "@/hooks/usePeopleList";
import {
  useTimeOffList, useTimeOffSettings, useTimeOffMutations, type TimeOffRecord,
} from "@/hooks/useTimeOff";
import { TimeOffForm } from "@/components/time-off/TimeOffForm";
import { QueryError } from "@/components/QueryError";
import {
  computeAlert, ALERT_MODE_LABELS, type AlertMode, type AlertSettings,
  type AlertLevel, DEFAULT_ALERT_SETTINGS,
} from "@/lib/timeOff/alerts";

const STATUS_LABEL: Record<string, string> = {
  agendada: "Agendada", em_andamento: "Em andamento", realizada: "Realizada",
  arquivada: "Arquivada", cancelada: "Cancelada",
};
const STATUS_CLASS: Record<string, string> = {
  agendada: "bg-accent/10 text-accent border-accent/20",
  em_andamento: "bg-warning/10 text-warning border-warning/20",
  realizada: "bg-success/10 text-success border-success/20",
  arquivada: "bg-muted text-muted-foreground",
  cancelada: "bg-destructive/10 text-destructive border-destructive/20",
};

function fmt(d: string) {
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
}

export default function TimeOffPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: permsLoading } = useUserPermissions();

  useEffect(() => {
    if (!permsLoading && !isAdmin) {
      toast.error("Sem permissão para acessar Férias.");
      navigate("/", { replace: true });
    }
  }, [isAdmin, permsLoading, navigate]);

  const list = useTimeOffList();
  const { data: settings = DEFAULT_ALERT_SETTINGS } = useTimeOffSettings();
  const { data: people = [] } = usePeopleList();
  const { remove, saveSettings, syncPipefy } = useTimeOffMutations();
  const [formOpen, setFormOpen] = useState(false);

  const records = list.data ?? [];

  // membership_id -> registros
  const recordsByMember = useMemo(() => {
    const map = new Map<string, TimeOffRecord[]>();
    for (const r of records) {
      if (!r.membership_id) continue;
      const arr = map.get(r.membership_id) ?? [];
      arr.push(r);
      map.set(r.membership_id, arr);
    }
    return map;
  }, [records]);

  // Alerta por pessoa
  const peopleWithAlert = useMemo(() => {
    const now = new Date();
    return people.map((p) => {
      const recs = recordsByMember.get(p.id) ?? [];
      const alert = computeAlert(
        { hire_date: p.hire_date ?? null },
        recs.map((r) => ({ start_date: r.start_date, end_date: r.end_date, status: r.status })),
        settings,
        now,
      );
      return {
        id: p.id,
        name: p.user?.full_name || p.user?.email || "Sem nome",
        hireDate: p.hire_date ?? null,
        level: alert.level as AlertLevel,
        monthsElapsed: alert.monthsElapsed,
        count: recs.length,
      };
    });
  }, [people, recordsByMember, settings]);

  const overdue = useMemo(
    () => peopleWithAlert.filter((p) => p.level === "overdue").sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [peopleWithAlert],
  );
  const soon = useMemo(
    () => peopleWithAlert.filter((p) => p.level === "soon").sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [peopleWithAlert],
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Palmtree className="h-6 w-6" />
              Férias / Ausências
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Controle de férias e suspensão de contrato (PJ) — visão administrativa.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => syncPipefy.mutate()}
              disabled={syncPipefy.isPending}
            >
              <RefreshCw className={`h-4 w-4 ${syncPipefy.isPending ? "animate-spin" : ""}`} />
              {syncPipefy.isPending ? "Sincronizando..." : "Sincronizar Pipefy"}
            </Button>
            <Button onClick={() => setFormOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Novo registro
            </Button>
          </div>
        </div>

        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="overdue">
              Falta tirar{overdue.length > 0 && (
                <span className="ml-1.5 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none">{overdue.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="soon">
              Próximos{soon.length > 0 && (
                <span className="ml-1.5 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none">{soon.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* HISTÓRICO */}
          <TabsContent value="history" className="mt-4">
            {list.isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : list.isError ? (
              <QueryError message="Não foi possível carregar os registros de férias." onRetry={() => list.refetch()} />
            ) : records.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Palmtree className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum registro ainda. Lance um histórico ou sincronize com o Pipefy.</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Pessoa</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Dias</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">{r.person_name}</TableCell>
                        <TableCell className="text-sm">{fmt(r.start_date)} → {fmt(r.end_date)}</TableCell>
                        <TableCell className="text-right text-sm">{r.days}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_CLASS[r.status]}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={r.source === "pipefy" ? "bg-primary/10 text-primary border-primary/20" : ""}>
                            {r.source === "pipefy" ? "Pipefy" : "Manual"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.source === "manual" && (
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => remove.mutate(r.id)}
                              aria-label="Remover registro"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* FALTA TIRAR */}
          <TabsContent value="overdue" className="mt-4 space-y-4">
            <AlertSettingsBar settings={settings} onSave={(s) => saveSettings.mutate(s)} saving={saveSettings.isPending} />
            <AlertPeopleTable people={overdue} emptyText="Ninguém em atraso pelo critério atual." />
          </TabsContent>

          {/* PRÓXIMOS */}
          <TabsContent value="soon" className="mt-4 space-y-4">
            <AlertSettingsBar settings={settings} onSave={(s) => saveSettings.mutate(s)} saving={saveSettings.isPending} />
            <AlertPeopleTable people={soon} emptyText="Ninguém próximo de tirar pelo critério atual." />
          </TabsContent>
        </Tabs>
      </div>

      <TimeOffForm open={formOpen} onOpenChange={setFormOpen} />
    </AppLayout>
  );
}

function AlertSettingsBar({
  settings, onSave, saving,
}: { settings: AlertSettings; onSave: (s: AlertSettings) => void; saving: boolean }) {
  const [mode, setMode] = useState<AlertMode>(settings.alert_mode);
  const [overdue, setOverdue] = useState(settings.overdue_months);
  const [soon, setSoon] = useState(settings.soon_months);

  useEffect(() => {
    setMode(settings.alert_mode); setOverdue(settings.overdue_months); setSoon(settings.soon_months);
  }, [settings]);

  const dirty = mode !== settings.alert_mode || overdue !== settings.overdue_months || soon !== settings.soon_months;
  const scheduled = mode === "scheduled";

  return (
    <div className="rounded-lg border bg-muted/30 p-4 flex flex-wrap items-end gap-3">
      <Settings2 className="h-4 w-4 text-muted-foreground mb-2.5" />
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Critério do alerta</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as AlertMode)}>
          <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(ALERT_MODE_LABELS) as AlertMode[]).map((m) => (
              <SelectItem key={m} value={m}>{ALERT_MODE_LABELS[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{scheduled ? "Janela (meses)" : "Próximo a partir de (meses)"}</Label>
        <Input type="number" min={1} className="w-[140px]" value={soon} onChange={(e) => setSoon(Math.max(1, Number(e.target.value)))} />
      </div>
      {!scheduled && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Atrasado a partir de (meses)</Label>
          <Input type="number" min={1} className="w-[140px]" value={overdue} onChange={(e) => setOverdue(Math.max(1, Number(e.target.value)))} />
        </div>
      )}
      <Button size="sm" disabled={!dirty || saving} onClick={() => onSave({ alert_mode: mode, overdue_months: overdue, soon_months: soon })}>
        {saving ? "Salvando..." : "Salvar critério"}
      </Button>
    </div>
  );
}

function AlertPeopleTable({
  people, emptyText,
}: { people: { id: string; name: string; hireDate: string | null; monthsElapsed: number | null; count: number }[]; emptyText: string }) {
  if (people.length === 0) {
    return <div className="py-12 text-center text-sm text-muted-foreground">{emptyText}</div>;
  }
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Pessoa</TableHead>
            <TableHead>Admissão</TableHead>
            <TableHead className="text-right">Meses</TableHead>
            <TableHead className="text-right">Ausências registradas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium text-sm">{p.name}</TableCell>
              <TableCell className="text-sm">{p.hireDate ? fmt(p.hireDate) : <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-right text-sm">{p.monthsElapsed ?? "—"}</TableCell>
              <TableCell className="text-right text-sm">{p.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
