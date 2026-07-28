import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle, ClipboardList } from "lucide-react";
import { useCreateCheckin, useOkrSettings } from "@/hooks/useCheckins";
import { krProgressForValue } from "@/lib/kr-progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface KRData {
  id: string;
  title: string;
  current_value: number;
  target_value: number;
  initial_value: number;
  unit: string | null;
  objective_id: string;
  kr_type?: string | null;
  direction?: string | null;
}

interface BulkCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveTitle: string;
  keyResults: KRData[];
}

interface KRCheckinEntry {
  newValue: number;
  comment: string;
  perceivedRisk: "green" | "yellow" | "red";
  hasBlocker: boolean;
  blockerDescription: string;
  completed: boolean;
  error: string | null;
}

const riskConfig = {
  green: { label: "OK", color: "bg-emerald-500", icon: CheckCircle2 },
  yellow: { label: "Atenção", color: "bg-yellow-500", icon: AlertCircle },
  red: { label: "Risco", color: "bg-red-500", icon: AlertCircle },
};

export function BulkCheckinDialog({
  open,
  onOpenChange,
  objectiveTitle,
  keyResults,
}: BulkCheckinDialogProps) {
  const [entries, setEntries] = useState<Record<string, KRCheckinEntry>>(() =>
    Object.fromEntries(
      keyResults.map((kr) => [
        kr.id,
        {
          newValue: kr.current_value,
          comment: "",
          perceivedRisk: "green" as const,
          hasBlocker: false,
          blockerDescription: "",
          completed: false,
          error: null,
        },
      ])
    )
  );
  const [submitting, setSubmitting] = useState(false);

  const createCheckin = useCreateCheckin();
  const { data: settings } = useOkrSettings();
  const minChars = settings?.checkin_min_chars || 20;

  const updateEntry = (krId: string, partial: Partial<KRCheckinEntry>) => {
    setEntries((prev) => ({
      ...prev,
      [krId]: { ...prev[krId], ...partial },
    }));
  };

  const handleSubmitAll = async () => {
    setSubmitting(true);
    let successCount = 0;

    for (const kr of keyResults) {
      const entry = entries[kr.id];
      if (entry.completed) continue;

      if (entry.comment.length < minChars) {
        updateEntry(kr.id, { error: `Mín. ${minChars} caracteres` });
        continue;
      }

      try {
        await createCheckin.mutateAsync({
          key_result_id: kr.id,
          objective_id: kr.objective_id,
          previous_value: kr.current_value,
          new_value: entry.newValue,
          comment: entry.comment,
          perceived_risk: entry.perceivedRisk,
          has_blocker: entry.hasBlocker,
          blocker_description: entry.hasBlocker ? entry.blockerDescription : undefined,
        });
        updateEntry(kr.id, { completed: true, error: null });
        successCount++;
      } catch {
        updateEntry(kr.id, { error: "Erro ao salvar" });
      }
    }

    setSubmitting(false);

    if (successCount === keyResults.length) {
      toast.success("Check-in em massa concluído!");
      onOpenChange(false);
    } else if (successCount > 0) {
      toast.warning(`${successCount}/${keyResults.length} check-ins salvos. Corrija os erros e tente novamente.`);
    } else {
      toast.error("Nenhum check-in foi salvo. Verifique os campos.");
    }
  };

  const allCompleted = keyResults.every((kr) => entries[kr.id]?.completed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Check-in em Massa
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{objectiveTitle}</p>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-2">
          <div className="space-y-4">
            {keyResults.map((kr, idx) => {
              const entry = entries[kr.id];
              if (!entry) return null;

              const progress = krProgressForValue(entry.newValue, kr);

              return (
                <div key={kr.id} className={cn(
                  "rounded-lg border p-4 space-y-3 transition-colors",
                  entry.completed ? "bg-emerald-500/5 border-emerald-500/30" : "bg-card"
                )}>
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">KR{idx + 1}</span>
                      <span className="text-sm font-medium">{kr.title}</span>
                    </div>
                    {entry.completed ? (
                      <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Salvo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{progress}%</Badge>
                    )}
                  </div>

                  {!entry.completed && (
                    <>
                      {/* Value */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Label className="text-xs">Valor</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={entry.newValue}
                            onChange={(e) => updateEntry(kr.id, { newValue: Number(e.target.value) })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground pt-5">
                          / {kr.target_value} {kr.unit || ""}
                        </div>
                      </div>

                      {/* Comment */}
                      <div>
                        <Label className="text-xs">Comentário (mín. {minChars})</Label>
                        <Textarea
                          value={entry.comment}
                          onChange={(e) => updateEntry(kr.id, { comment: e.target.value, error: null })}
                          placeholder="O que foi feito?"
                          rows={2}
                          className="text-sm"
                        />
                        {entry.error && (
                          <p className="text-xs text-destructive mt-1">{entry.error}</p>
                        )}
                      </div>

                      {/* Risk */}
                      <RadioGroup
                        value={entry.perceivedRisk}
                        onValueChange={(v) => updateEntry(kr.id, { perceivedRisk: v as any })}
                        className="flex gap-2"
                      >
                        {(["green", "yellow", "red"] as const).map((risk) => (
                          <div key={risk} className="flex items-center">
                            <RadioGroupItem value={risk} id={`${kr.id}-${risk}`} className="peer sr-only" />
                            <Label
                              htmlFor={`${kr.id}-${risk}`}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-md border cursor-pointer text-xs transition-all",
                                "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                              )}
                            >
                              <div className={cn("h-2 w-2 rounded-full", riskConfig[risk].color)} />
                              {riskConfig[risk].label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            {keyResults.filter((kr) => entries[kr.id]?.completed).length}/{keyResults.length} concluídos
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {!allCompleted && (
              <Button onClick={handleSubmitAll} disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar Todos"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
