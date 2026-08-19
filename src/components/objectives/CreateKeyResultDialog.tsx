import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useCreateKeyResult } from "@/hooks/useCreateKeyResult";
import { toast } from "sonner";
import { toastDbError } from "@/lib/db-errors";

interface CreateKeyResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveId: string;
  objectiveType?: string;
}

const krTypes = [
  { value: "numeric", label: "Numérico" },
  { value: "percent", label: "Percentual" },
  { value: "binary", label: "Binário (Sim/Não)" },
  { value: "currency", label: "Monetário" },
  { value: "sla_time", label: "SLA/Tempo" },
];

export function CreateKeyResultDialog({
  open,
  onOpenChange,
  objectiveId,
  objectiveType,
}: CreateKeyResultDialogProps) {
  const isOperational = objectiveType === undefined || objectiveType === "operational";
  const [title, setTitle] = useState("");
  const [krType, setKrType] = useState("numeric");
  const [direction, setDirection] = useState("up");
  const [initialValue, setInitialValue] = useState("0");
  const [targetValue, setTargetValue] = useState("100");
  const [unit, setUnit] = useState("%");
  const [weight, setWeight] = useState("0");

  const createKR = useCreateKeyResult();

  const isBinary = krType === "binary";

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Informe o título do Key Result.");
      return;
    }

    createKR.mutate(
      {
        objective_id: objectiveId,
        title: title.trim(),
        kr_type: krType,
        direction,
        initial_value: isBinary ? 0 : Number(initialValue),
        target_value: isBinary ? 1 : Number(targetValue),
        unit: isBinary ? "bool" : unit,
        weight_percentage: Number(weight),
      },
      {
        onSuccess: () => {
          toast.success("Key Result criado com sucesso!");
          resetForm();
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          // toastDbError traduz os erros de trigger (ex.: P0001 "Key Results
          // can only be added to operational objectives") para pt-BR.
          toastDbError(err, "Erro ao criar KR");
        },
      }
    );
  };

  const resetForm = () => {
    setTitle("");
    setKrType("numeric");
    setDirection("up");
    setInitialValue("0");
    setTargetValue("100");
    setUnit("%");
    setWeight("0");
  };

  if (!isOperational) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Key Result</DialogTitle>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-600">
            Este objetivo não aceita resultados-chave (apenas objetivos operacionais).
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Key Result</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Título *</Label>
            <Input
              placeholder="Ex: Aumentar receita mensal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={krType} onValueChange={setKrType}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {krTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Direção</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="up">↑ Subir</SelectItem>
                  <SelectItem value="down">↓ Descer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isBinary && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Inicial</Label>
                <Input
                  type="number"
                  value={initialValue}
                  onChange={(e) => setInitialValue(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Meta</Label>
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unidade</Label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="%"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Peso (%) — opcional</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Sem pesos definidos, todos os KRs contam igual. Com pesos, KR de peso 0 não conta.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={createKR.isPending}>
            {createKR.isPending ? "Criando..." : "Criar KR"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
