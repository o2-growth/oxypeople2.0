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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  TrendingUp,
  Paperclip,
  ArrowRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useCreateCheckin, useCheckins, useOkrSettings } from "@/hooks/useCheckins";
import { useUploadCheckinAttachments } from "@/hooks/useCheckinAttachments";
import { AttachmentUploader } from "./AttachmentUploader";
import { CheckinStreak } from "./CheckinStreak";
import { krProgressForValue, formatKrValue } from "@/lib/kr-progress";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyResult: {
    id: string;
    title: string;
    current_value: number;
    target_value: number;
    initial_value?: number;
    unit: string | null;
    objective_id: string;
    /** Tipo do KR (numeric | percent | currency | binary). Ajusta input e preview. */
    kr_type?: string | null;
    /** Direção da meta (up | down). Respeitada no cálculo do avanço. */
    direction?: string | null;
  };
}

const riskConfig = {
  green: { label: "No caminho", color: "bg-emerald-500", icon: CheckCircle2 },
  yellow: { label: "Atenção", color: "bg-yellow-500", icon: AlertCircle },
  red: { label: "Em risco", color: "bg-red-500", icon: AlertCircle },
};

export function CheckinDialog({ open, onOpenChange, keyResult }: CheckinDialogProps) {
  const [newValue, setNewValue] = useState(keyResult.current_value);
  const [comment, setComment] = useState("");
  const [perceivedRisk, setPerceivedRisk] = useState<"green" | "yellow" | "red">("green");
  const [hasBlocker, setHasBlocker] = useState(false);
  const [blockerDescription, setBlockerDescription] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  const createCheckin = useCreateCheckin();
  const uploadAttachments = useUploadCheckinAttachments();
  const { data: checkins = [] } = useCheckins(keyResult.id);
  const { data: settings } = useOkrSettings();

  const minChars = settings?.checkin_min_chars || 20;

  const handleSubmit = async () => {
    if (comment.length < minChars) {
      toast.error(`Comentário deve ter pelo menos ${minChars} caracteres`);
      return;
    }

    if (hasBlocker && !blockerDescription.trim()) {
      toast.error("Descreva o bloqueio encontrado");
      return;
    }

    try {
      const checkin = await createCheckin.mutateAsync({
        key_result_id: keyResult.id,
        objective_id: keyResult.objective_id,
        previous_value: keyResult.current_value,
        new_value: newValue,
        comment,
        perceived_risk: perceivedRisk,
        has_blocker: hasBlocker,
        blocker_description: hasBlocker ? blockerDescription : undefined,
      });

      // Upload attachments if any
      if (attachmentFiles.length > 0) {
        try {
          await uploadAttachments.mutateAsync({
            checkinId: checkin.id,
            files: attachmentFiles,
          });
        } catch {
          toast.warning("Check-in salvo, mas houve erro ao enviar anexos");
        }
      }

      toast.success("Check-in registrado!");
      setComment("");
      setPerceivedRisk("green");
      setHasBlocker(false);
      setBlockerDescription("");
      setAttachmentFiles([]);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao registrar check-in");
    }
  };

  // Tipo do KR molda o input e o preview (percent %, currency R$, binary toggle).
  const krType = keyResult.kr_type ?? "numeric";
  const isBinary = krType === "binary";
  const isCurrency = krType === "currency";
  const isPercent = krType === "percent";
  const isDone = newValue >= keyResult.target_value;

  // Preview de avanço AO VIVO (antes → depois) pela lib canônica de KR,
  // respeitando direção e valor inicial.
  const beforePct = krProgressForValue(keyResult.current_value, keyResult);
  const afterPct = krProgressForValue(newValue, keyResult);
  const delta = afterPct - beforePct;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Check-in
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* KR Info */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{keyResult.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Atual:{" "}
              {isBinary
                ? (keyResult.current_value >= keyResult.target_value
                    ? "Concluído"
                    : `${Math.round(beforePct)}% concluído`)
                : formatKrValue(keyResult.current_value, krType, keyResult.unit)}
            </p>
          </div>

          {/* Novo valor — input por tipo de KR */}
          <div className="space-y-3">
            <Label>{isBinary ? "Quanto deste entregável está pronto?" : "Valor atualizado *"}</Label>

            {isBinary ? (
              // Avanço parcial em entregável: o dono reporta o % real, sem ser
              // obrigado ao "100% ou nada". Concluído é só o atalho para 100.
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Slider
                    value={[Math.round(afterPct)]}
                    onValueChange={([v]) => setNewValue((v / 100) * keyResult.target_value)}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="w-12 text-right text-sm font-semibold tabular-nums">
                    {Math.round(afterPct)}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNewValue(isDone ? (keyResult.initial_value ?? 0) : keyResult.target_value)
                  }
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-lg border-2 border-muted p-3 text-sm font-medium transition-all",
                    isDone && "border-primary bg-primary/5 text-primary",
                  )}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  {isDone ? "Concluído — clique para desfazer" : "Marcar como concluído"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    {isCurrency && (
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        R$
                      </span>
                    )}
                    <Input
                      type="number"
                      step="0.01"
                      value={newValue}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setNewValue(Number.isNaN(n) ? 0 : n);
                      }}
                      className={cn(isCurrency && "pl-9", isPercent && "pr-8")}
                    />
                    {isPercent && (
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </span>
                    )}
                  </div>
                  {!isCurrency && !isPercent && keyResult.unit && (
                    <span className="shrink-0 text-sm text-muted-foreground">{keyResult.unit}</span>
                  )}
                </div>

                {krType === "numeric" && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Rápido:</span>
                    {[1, 10].map((step) => (
                      <Button
                        key={step}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setNewValue((v) => Math.round((v + step) * 100) / 100)}
                      >
                        +{step}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Preview de avanço AO VIVO — antes → depois */}
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Avanço</span>
                <div className="flex items-center gap-1.5 tabular-nums">
                  <span className="text-sm text-muted-foreground">{beforePct}%</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-base font-bold text-primary">{afterPct}%</span>
                  {delta !== 0 && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-1 border-0 text-[11px]",
                        delta > 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {delta > 0 ? "+" : ""}{delta} pts
                    </Badge>
                  )}
                </div>
              </div>
              <Progress value={afterPct} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Meta: {formatKrValue(keyResult.target_value, krType, keyResult.unit)} · Início:{" "}
                {formatKrValue(keyResult.initial_value ?? 0, krType, keyResult.unit)}
              </p>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label>Comentário * (mín. {minChars} caracteres)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="O que foi feito? Qual o contexto da evolução?"
              rows={3}
            />
            <p className={cn(
              "text-xs",
              comment.length < minChars ? "text-destructive" : "text-muted-foreground"
            )}>
              {comment.length}/{minChars} caracteres mínimos
            </p>
          </div>

          {/* Perceived Risk */}
          <div className="space-y-2">
            <Label>Risco Percebido *</Label>
            <RadioGroup
              value={perceivedRisk}
              onValueChange={(v) => setPerceivedRisk(v as any)}
              className="grid grid-cols-3 gap-2"
            >
              {(["green", "yellow", "red"] as const).map((risk) => {
                const config = riskConfig[risk];
                const Icon = config.icon;
                return (
                  <div key={risk}>
                    <RadioGroupItem value={risk} id={`risk-${risk}`} className="peer sr-only" />
                    <Label
                      htmlFor={`risk-${risk}`}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 border-muted cursor-pointer transition-all",
                        "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                      )}
                    >
                      <div className={cn("h-3 w-3 rounded-full", config.color)} />
                      <span className="text-xs font-medium">{config.label}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Blocker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Existe algum bloqueio?</Label>
              <Switch checked={hasBlocker} onCheckedChange={setHasBlocker} />
            </div>
            {hasBlocker && (
              <Textarea
                value={blockerDescription}
                onChange={(e) => setBlockerDescription(e.target.value)}
                placeholder="Descreva o bloqueio..."
                rows={2}
              />
            )}
          </div>

          {/* Attachments */}
          <AttachmentUploader files={attachmentFiles} onChange={setAttachmentFiles} />

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={createCheckin.isPending || comment.length < minChars}
          >
            {createCheckin.isPending ? "Registrando..." : "Registrar Check-in"}
          </Button>

          {/* History */}
          {checkins.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Histórico ({checkins.length})
                </h4>
                <CheckinStreak checkins={checkins} className="px-0.5" />
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {checkins.map((checkin) => (
                      <div key={checkin.id} className="p-2.5 rounded-lg bg-muted/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {checkin.user && (
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={checkin.user.avatar_url || ""} />
                                <AvatarFallback className="text-[8px]">
                                  {(checkin.user.full_name || checkin.user.email).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <span className="text-xs font-medium">
                              {isBinary
                                ? `${krProgressForValue(checkin.previous_value, keyResult)}% → ${krProgressForValue(checkin.new_value, keyResult)}%`
                                : `${checkin.previous_value} → ${Number(checkin.new_value)}`}
                            </span>
                            <div className={cn("h-2 w-2 rounded-full", riskConfig[checkin.perceived_risk as keyof typeof riskConfig]?.color || "bg-muted")} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(checkin.created_at), "dd MMM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{checkin.comment}</p>
                        {checkin.has_blocker && (
                          <Badge variant="destructive" className="text-[10px]">
                            🚫 {checkin.blocker_description || "Bloqueio"}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
