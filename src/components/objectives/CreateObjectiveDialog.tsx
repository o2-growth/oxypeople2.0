import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamSelector } from "./TeamSelector";
import { PersonSelector } from "./PersonSelector";
import { MultiPersonSelector } from "./MultiPersonSelector";
import { ParentObjectiveSelector } from "./ParentObjectiveSelector";
import { DepartmentSelector } from "./DepartmentSelector";
import { TagsInput } from "./TagsInput";
import { useCreateObjective, usePeriods, useObjectives, ObjectiveType } from "@/hooks/useObjectives";
import { useOkrTier } from "@/hooks/useOkrTier";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { toastDbError } from "@/lib/db-errors";
import { Plus, Trash2, Crosshair, Layers, Zap, Rocket, CheckCircle2, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const keyResultSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  targetValue: z.coerce.number().min(0.01, "Meta deve ser maior que 0"),
  currentValue: z.coerce.number().min(0).default(0),
  initialValue: z.coerce.number().min(0).default(0),
  unit: z.string().default("%"),
  krType: z.string().default("numeric"),
  weightPercentage: z.coerce.number().min(0).max(100).default(0),
  direction: z.enum(["up", "down"]).default("up"),
});

const formSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  type: z.enum(["strategic", "tactical", "operational"]),
  ownerId: z.string().min(1, "Responsável obrigatório"),
  teamId: z.string().optional(),
  parentId: z.string().optional(),
  periodId: z.string().optional(),
  department: z.string().optional(),
  visibility: z.enum(["public", "company", "private"]),
  commitmentType: z.enum(["committed", "aspirational"]).default("committed"),
  tags: z.array(z.string()).default([]),
  contributors: z.array(z.string()).default([]),
  editors: z.array(z.string()).default([]),
  keyResults: z.array(keyResultSchema).default([]),
});

type FormData = z.infer<typeof formSchema>;

interface CreateObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: ObjectiveType;
  defaultParentId?: string;
}

export function CreateObjectiveDialog({
  open,
  onOpenChange,
  defaultType = "operational",
  defaultParentId,
}: CreateObjectiveDialogProps) {
  const { user } = useAuth();
  const { canCreateObjective, isLoading: tierLoading } = useOkrTier();
  const createObjective = useCreateObjective();
  const { data: periods = [] } = usePeriods();
  const { data: allObjectives = [] } = useObjectives();

  // Find parent objective to inherit context
  const parentObjective = defaultParentId
    ? allObjectives.find((o) => o.id === defaultParentId)
    : undefined;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: defaultType,
      visibility: "company",
      commitmentType: "committed",
      ownerId: user?.id || "",
      contributors: [],
      editors: [],
      tags: [],
      keyResults: [],
      parentId: defaultParentId,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        description: parentObjective ? `Derivado de: ${parentObjective.title}` : "",
        type: defaultType,
        visibility: (parentObjective?.visibility as "company" | "public" | "private") || "company",
        commitmentType: "committed",
        ownerId: user?.id || "",
        contributors: [],
        editors: [],
        tags: [],
        keyResults: defaultType === "operational" ? [{ title: "", targetValue: 100, currentValue: 0, initialValue: 0, unit: "%", krType: "numeric", weightPercentage: 100 }] : [],
        parentId: defaultParentId,
        periodId: parentObjective?.period_id || undefined,
        department: parentObjective?.department || undefined,
      });
    }
  }, [open, defaultType, defaultParentId, user?.id]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "keyResults",
  });

  const selectedType = form.watch("type");
  const ownerId = form.watch("ownerId");
  const watchedParentId = form.watch("parentId");
  const watchedKRs = form.watch("keyResults");

  // Inherit period from parent objective
  React.useEffect(() => {
    if (watchedParentId) {
      const parent = allObjectives.find((o) => o.id === watchedParentId);
      if (parent?.period_id) {
        form.setValue("periodId", parent.period_id);
      }
    }
  }, [watchedParentId, allObjectives]);

  // KR weight validation
  const totalWeight = watchedKRs?.reduce((sum, kr) => sum + (kr.weightPercentage || 0), 0) || 0;
  const hasKRs = (watchedKRs?.length || 0) > 0;
  const weightInvalid = hasKRs && totalWeight > 0 && totalWeight !== 100;

  const handleSubmit = async (data: FormData) => {
    try {
      // Defensive: KRs are only valid for operational objectives.
      if (data.type !== "operational") {
        data.keyResults = [];
      }

      // Validate weight sum for KRs
      if (data.keyResults.length > 0) {
        const totalWeight = data.keyResults.reduce((sum, kr) => sum + (kr.weightPercentage || 0), 0);
        if (totalWeight > 0 && totalWeight !== 100) {
          toast.error(`A soma dos pesos dos KRs deve ser 100% (atual: ${totalWeight}%)`);
          return;
        }
      }

      await createObjective.mutateAsync({
        title: data.title,
        description: data.description,
        visibility: data.visibility,
        type: data.type as ObjectiveType,
        team_id: data.teamId,
        owner_id: data.ownerId,
        parent_id: data.parentId,
        period_id: data.periodId,
        department: data.department,
        tags: data.tags.length > 0 ? data.tags : undefined,
        commitment_type: data.commitmentType,
        contributors: data.contributors,
        editors: data.editors,
        key_results: data.keyResults.map((kr) => ({
          title: kr.title,
          target_value: kr.targetValue,
          current_value: kr.currentValue,
          initial_value: kr.initialValue,
          unit: kr.unit,
          kr_type: kr.krType,
          weight_percentage: kr.weightPercentage,
        })),
      });

      toast.success("Objetivo criado com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating objective:", error);
      toastDbError(error, "Erro ao criar objetivo");
    }
  };

  const canSelectType = canCreateObjective;
  const allowedParentTypes: Array<"strategic" | "tactical" | "operational"> | undefined =
    selectedType === "tactical"
      ? ["strategic"]
      : selectedType === "operational"
        ? ["strategic", "tactical"]
        : undefined;
  const showParentSelector = selectedType !== "strategic";
  const showKRSection = selectedType === "operational";

  if (tierLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Carregando…</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!canCreateObjective) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sem permissão</DialogTitle>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-600">
            Você não tem permissão para criar objetivos.
          </div>
          <div className="flex justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Objetivo</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">Gerais</TabsTrigger>
                <TabsTrigger value="keyresults">Key Results</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título do Objetivo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: Aumentar receita previsível" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Contexto e detalhes do objetivo..." rows={2} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nível Hierárquico</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-3 gap-3"
                        >
                          <div>
                            <RadioGroupItem value="strategic" id="strategic" className="peer sr-only" disabled={!canSelectType} />
                            <Label
                              htmlFor="strategic"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-violet-500 cursor-pointer peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"
                            >
                              <Crosshair className="mb-1.5 h-5 w-5 text-violet-400" />
                              <span className="text-xs font-medium">Estratégico</span>
                              <span className="text-[10px] text-muted-foreground">CEO / Diretoria</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="tactical" id="tactical" className="peer sr-only" disabled={!canSelectType} />
                            <Label
                              htmlFor="tactical"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-blue-500 cursor-pointer peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"
                            >
                              <Layers className="mb-1.5 h-5 w-5 text-blue-400" />
                              <span className="text-xs font-medium">Tático</span>
                              <span className="text-[10px] text-muted-foreground">Heads / Gestores</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="operational" id="operational" className="peer sr-only" />
                            <Label
                              htmlFor="operational"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-emerald-500 cursor-pointer"
                            >
                              <Zap className="mb-1.5 h-5 w-5 text-emerald-400" />
                              <span className="text-xs font-medium">Operacional</span>
                              <span className="text-[10px] text-muted-foreground">Líder / Pessoa</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Commitment type */}
                <FormField
                  control={form.control}
                  name="commitmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de comprometimento</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-2 gap-3"
                        >
                          <div>
                            <RadioGroupItem value="committed" id="ct-committed" className="peer sr-only" />
                            <Label
                              htmlFor="ct-committed"
                              className="flex flex-col items-start rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-emerald-500 cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                <span className="text-xs font-medium">Committed</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground mt-1">Entrega esperada — 100%</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="aspirational" id="ct-aspirational" className="peer sr-only" />
                            <Label
                              htmlFor="ct-aspirational"
                              className="flex flex-col items-start rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-purple-500 cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5">
                                <Rocket className="h-4 w-4 text-purple-400" />
                                <span className="text-xs font-medium">Aspirational</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground mt-1">Moonshot — 70% já é vitória</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Row: Owner + Team + Department */}
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="ownerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dono *</FormLabel>
                        <FormControl>
                          <PersonSelector value={field.value} onValueChange={field.onChange} placeholder="Selecione" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="teamId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <TeamSelector value={field.value} onValueChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área</FormLabel>
                        <FormControl>
                          <DepartmentSelector value={field.value} onValueChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row: Parent + Period */}
                <div className={cn("grid gap-3", showParentSelector ? "grid-cols-2" : "grid-cols-1")}>
                  {showParentSelector && (
                    <FormField
                      control={form.control}
                      name="parentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objetivo Pai</FormLabel>
                          <FormControl>
                            <ParentObjectiveSelector
                              value={field.value}
                              onValueChange={field.onChange}
                              allowedParentTypes={allowedParentTypes}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="periodId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Período {watchedParentId ? "(herdado)" : ""}</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || "none"}
                            onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                            disabled={!!watchedParentId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem período</SelectItem>
                              {periods.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Opções avançadas (colapsável) */}
                <Collapsible className="rounded-lg border border-dashed">
                  <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                    <span>Opções avançadas</span>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 px-3 pb-3 pt-1">
                {/* Collaborators */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="contributors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contribuintes</FormLabel>
                        <FormControl>
                          <MultiPersonSelector
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Adicionar"
                            excludeIds={ownerId ? [ownerId] : []}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="editors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Editores</FormLabel>
                        <FormControl>
                          <MultiPersonSelector
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Adicionar"
                            excludeIds={ownerId ? [ownerId] : []}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Tags + Visibility */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <TagsInput value={field.value} onValueChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visibilidade</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="company">Empresa</SelectItem>
                              <SelectItem value="private">Privado</SelectItem>
                              <SelectItem value="public">Público</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                  </CollapsibleContent>
                </Collapsible>
              </TabsContent>

              <TabsContent value="keyresults" className="space-y-4 mt-4">
                {!showKRSection && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-600">
                    Resultados-chave só são permitidos em objetivos operacionais.
                  </div>
                )}

                {showKRSection && fields.map((field, index) => (
                  <div key={field.id} className="p-3 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">KR {index + 1}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(index)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name={`keyResults.${index}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Título do KR" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-4 gap-2">
                      <FormField
                        control={form.control}
                        name={`keyResults.${index}.targetValue`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Meta</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`keyResults.${index}.initialValue`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Valor Inicial</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`keyResults.${index}.unit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Unidade</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="%">%</SelectItem>
                                  <SelectItem value="R$">R$</SelectItem>
                                  <SelectItem value="un">Unidades</SelectItem>
                                  <SelectItem value="pts">Pontos</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`keyResults.${index}.weightPercentage`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Peso (%)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={100} {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Direction + KR Type */}
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name={`keyResults.${index}.krType`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Tipo</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="numeric">Numérico</SelectItem>
                                  <SelectItem value="percent">Percentual</SelectItem>
                                  <SelectItem value="binary">Binário</SelectItem>
                                  <SelectItem value="currency">Monetário</SelectItem>
                                  <SelectItem value="sla_time">SLA/Tempo</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`keyResults.${index}.direction`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Direção</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="up">↑ Maior é melhor</SelectItem>
                                  <SelectItem value="down">↓ Menor é melhor</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}

                {/* Weight validation bar */}
                {showKRSection && hasKRs && (
                  <div className="p-3 rounded-lg border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Soma atual: {totalWeight}% / 100%</span>
                      <span className={cn(
                        "text-xs font-bold",
                        totalWeight === 100 ? "text-emerald-500" : totalWeight > 100 ? "text-red-500" : "text-amber-500"
                      )}>
                        {totalWeight}/100%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          totalWeight === 100 ? "bg-emerald-500" : totalWeight > 100 ? "bg-red-500" : "bg-amber-500"
                        )}
                        style={{ width: `${Math.min(totalWeight, 100)}%` }}
                      />
                    </div>
                    {weightInvalid && (
                      <p className="text-[10px] text-amber-500">
                        ⚠️ A soma dos pesos deve ser exatamente 100% para criar o objetivo.
                      </p>
                    )}
                  </div>
                )}

                {showKRSection && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() =>
                      append({
                        title: "",
                        targetValue: 100,
                        currentValue: 0,
                        initialValue: 0,
                        unit: "%",
                        krType: "numeric",
                        weightPercentage: 0,
                        direction: "up",
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Key Result
                  </Button>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createObjective.isPending || weightInvalid}>
                {createObjective.isPending ? "Criando..." : "Criar Objetivo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
