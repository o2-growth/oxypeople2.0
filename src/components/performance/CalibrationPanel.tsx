import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/QueryError";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Scale, Check } from "lucide-react";
import {
  useCalibrationTargets, useCalibrationDetail, useSaveCalibration,
  CALIBRATION_SCALE, type CalibrationTarget,
} from "@/hooks/useCalibration";
import type { PerformanceCycle } from "@/hooks/usePerformanceCycles";

interface CalibrationPanelProps {
  cycles: PerformanceCycle[];
}

/** 2 e 2.5 na mesma coluna ficam desalinhados sem casa fixa. */
function nota(n: number | null): string {
  if (n === null) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

export function CalibrationPanel({ cycles }: CalibrationPanelProps) {
  // O ciclo ativo é onde a calibragem acontece; os concluídos ficam
  // disponíveis para consulta.
  const cicloPadrao = useMemo(
    () => cycles.find((c) => c.status === "active")?.id ?? cycles[0]?.id ?? null,
    [cycles],
  );
  const [cycleId, setCycleId] = useState<string | null>(cicloPadrao);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  useEffect(() => {
    if (!cycleId && cicloPadrao) setCycleId(cicloPadrao);
  }, [cicloPadrao, cycleId]);

  const targets = useCalibrationTargets(cycleId);
  const detalhe = useCalibrationDetail(cycleId, selecionado);
  const salvar = useSaveCalibration();

  // Trocar de ciclo com alguém aberto mostraria as atitudes de outro ciclo sob
  // o nome selecionado.
  useEffect(() => {
    setSelecionado(null);
  }, [cycleId]);

  const pessoas = targets.data ?? [];
  const pessoaAberta = pessoas.find((p) => p.evaluatedId === selecionado) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Scale className="h-4 w-4 text-muted-foreground" />
        <Select value={cycleId ?? ""} onValueChange={setCycleId}>
          <SelectTrigger className="w-[320px]">
            <SelectValue placeholder="Selecione o ciclo" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {targets.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : targets.isError ? (
        <QueryError
          message="Não foi possível carregar as pessoas para calibrar."
          onRetry={() => targets.refetch()}
        />
      ) : pessoas.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Nada para calibrar neste ciclo."
          description="Aparecem aqui as pessoas que você avaliou e cuja avaliação já foi concluída."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <ListaDeAvaliados
            pessoas={pessoas}
            selecionado={selecionado}
            onSelecionar={setSelecionado}
          />

          <Card>
            <CardContent className="p-4">
              {!pessoaAberta ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  Escolha alguém ao lado para ver as notas atitude por atitude.
                </div>
              ) : detalhe.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : detalhe.isError ? (
                <QueryError
                  message="Não foi possível carregar as notas desta pessoa."
                  onRetry={() => detalhe.refetch()}
                />
              ) : (
                <>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold">{pessoaAberta.fullName}</h3>
                    <p className="text-xs text-muted-foreground">
                      Escala 1 a 3 · a calibragem aceita meio ponto
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="min-w-[200px]">Atitude</TableHead>
                          <TableHead className="text-right">Autoavaliação</TableHead>
                          <TableHead className="text-right">Líder</TableHead>
                          <TableHead className="text-right">Média</TableHead>
                          <TableHead className="w-[140px]">Calibragem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(detalhe.data ?? []).map((linha) => (
                          <TableRow key={linha.questionId}>
                            <TableCell className="text-sm font-medium">
                              {linha.label}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {nota(linha.selfScore)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {nota(linha.leaderScore)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold">
                              {nota(linha.media)}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={
                                  linha.calibrado !== null ? String(linha.calibrado) : ""
                                }
                                onValueChange={(v) =>
                                  cycleId &&
                                  selecionado &&
                                  salvar.mutate({
                                    cycleId,
                                    evaluatedId: selecionado,
                                    questionId: linha.questionId,
                                    score: Number(v),
                                  })
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CALIBRATION_SCALE.map((v) => (
                                    <SelectItem key={v} value={String(v)}>
                                      {nota(v)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ListaDeAvaliados({
  pessoas, selecionado, onSelecionar,
}: {
  pessoas: CalibrationTarget[];
  selecionado: string | null;
  onSelecionar: (id: string) => void;
}) {
  const iniciais = (nome: string) =>
    nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardContent className="p-2">
        <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Avaliados ({pessoas.length})
        </p>
        <div className="space-y-1">
          {pessoas.map((p) => {
            const ativo = p.evaluatedId === selecionado;
            return (
              <button
                key={p.evaluatedId}
                type="button"
                onClick={() => onSelecionar(p.evaluatedId)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${
                  ativo ? "bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={p.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {iniciais(p.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.fullName}</p>
                  {p.evaluatorName && (
                    <p className="truncate text-xs text-muted-foreground">
                      avaliado por {p.evaluatorName}
                    </p>
                  )}
                </div>
                {p.calibradas > 0 && (
                  <Badge
                    variant="outline"
                    className="gap-1 bg-success/10 text-success border-success/20"
                  >
                    <Check className="h-3 w-3" />
                    {p.calibradas}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
