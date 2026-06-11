import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePeopleList } from "@/hooks/usePeopleList";
import { useTimeOffMutations, type TimeOffStatus } from "@/hooks/useTimeOff";
import { calcDays } from "@/lib/timeOff/alerts";

const STATUS_OPTIONS: { value: TimeOffStatus; label: string }[] = [
  { value: "realizada", label: "Realizada" },
  { value: "agendada", label: "Agendada" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "cancelada", label: "Cancelada" },
];

interface TimeOffFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimeOffForm({ open, onOpenChange }: TimeOffFormProps) {
  const { data: people = [] } = usePeopleList();
  const { create } = useTimeOffMutations();

  const [membershipId, setMembershipId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [days, setDays] = useState<number>(1);
  const [status, setStatus] = useState<TimeOffStatus>("realizada");
  const [notes, setNotes] = useState("");

  // Recalcula dias automaticamente quando as datas mudam.
  useEffect(() => {
    if (startDate && endDate) setDays(calcDays(startDate, endDate));
  }, [startDate, endDate]);

  const reset = () => {
    setMembershipId(""); setStartDate(""); setEndDate("");
    setDays(1); setStatus("realizada"); setNotes("");
  };

  const sortedPeople = useMemo(
    () => [...people].sort((a, b) =>
      (a.user?.full_name ?? "").localeCompare(b.user?.full_name ?? "", "pt-BR", { sensitivity: "base" })),
    [people],
  );

  const selected = people.find((p) => p.id === membershipId);
  const canSubmit = !!membershipId && !!startDate && !!endDate && endDate >= startDate;

  const handleSubmit = async () => {
    if (!canSubmit || !selected) return;
    await create.mutateAsync({
      membership_id: membershipId,
      person_name: selected.user?.full_name || "Sem nome",
      start_date: startDate,
      end_date: endDate,
      days,
      status,
      notes: notes.trim() || null,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo registro de ausência</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Pessoa</Label>
            <Select value={membershipId} onValueChange={setMembershipId}>
              <SelectTrigger><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
              <SelectContent>
                {sortedPeople.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.user?.full_name || p.user?.email || "Sem nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label>Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label>Fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label>Dias</Label>
              <Input
                type="number" min={0} value={days}
                onChange={(e) => setDays(Math.max(0, Number(e.target.value)))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TimeOffStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || create.isPending}>
            {create.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
