import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Grid3X3, Lock, Info } from "lucide-react";
import { toast } from "sonner";
import { useNineBoxSnapshot } from "@/hooks/useNineBoxSnapshot";
import { usePlacementMutations } from "@/hooks/usePlacementMutations";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { NineBoxGrid } from "@/components/admin/nineBox/NineBoxGrid";
import { NineBoxPool } from "@/components/admin/nineBox/NineBoxPool";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  finalized: "Finalizado — somente leitura",
  archived: "Arquivado — somente leitura",
};

function parseDropTarget(id: string | number): { type: "cell" | "pool"; perf?: number; pot?: number } | null {
  const idStr = String(id);
  if (idStr === "pool-drop") return { type: "pool" };
  const m = idStr.match(/^cell-(\d)-(\d)$/);
  if (m) return { type: "cell", perf: Number(m[1]), pot: Number(m[2]) };
  return null;
}

function parseDragSource(id: string | number): { type: "placement" | "pool"; raw: string } {
  const idStr = String(id);
  if (idStr.startsWith("pool-")) return { type: "pool", raw: idStr.replace(/^pool-/, "") };
  return { type: "placement", raw: idStr };
}

export default function NineBoxEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAdmin, isLoading: permsLoading } = useRequireAdmin({
    message: "Sem permissão.",
  });
  const { data, isLoading } = useNineBoxSnapshot(id);
  const { updatePlacement, createPlacement, deletePlacement } = usePlacementMutations();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );


  const isLocked = useMemo(
    () => data?.snapshot ? data.snapshot.status !== "draft" : false,
    [data?.snapshot],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!data?.snapshot || !id) return;
    if (isLocked) {
      toast.error("Snapshot finalizado. Reabra como rascunho para editar.");
      return;
    }
    if (!event.over) return;

    const target = parseDropTarget(event.over.id);
    if (!target) return;

    const source = parseDragSource(event.active.id);

    // Pool → Cell: criar placement
    if (source.type === "pool" && target.type === "cell" && target.perf && target.pot) {
      createPlacement.mutate({
        snapshotId: id,
        user_id: source.raw,
        performance_axis: target.perf,
        potential_axis: target.pot,
      });
      return;
    }

    // Cell → Pool: deletar placement
    if (source.type === "placement" && target.type === "pool") {
      deletePlacement.mutate({ placementId: source.raw, snapshotId: id });
      return;
    }

    // Cell → Cell: update placement
    if (source.type === "placement" && target.type === "cell" && target.perf && target.pot) {
      const placement = data.placements.find((p) => p.id === source.raw);
      if (!placement) return;
      // Mesma célula? ignore
      if (placement.performance_axis === target.perf && placement.potential_axis === target.pot) {
        return;
      }
      const performanceChanged = placement.performance_axis !== target.perf;
      const shouldOverride = performanceChanged && placement.performance_source === "auto";
      updatePlacement.mutate({
        placementId: source.raw,
        snapshotId: id,
        performance_axis: target.perf,
        potential_axis: target.pot,
        shouldOverride,
      });
    }
  };

  const handleRemove = (placementId: string) => {
    if (!id) return;
    if (isLocked) {
      toast.error("Snapshot finalizado. Reabra como rascunho para editar.");
      return;
    }
    deletePlacement.mutate({ placementId, snapshotId: id });
  };

  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/nine-box")}
          className="-ml-2 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para lista
        </Button>

        {isLoading ? (
          <Card>
            <CardContent className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : !data?.snapshot ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Grid3X3 className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Snapshot não encontrado.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                  <Grid3X3 className="h-6 w-6" />
                  {data.snapshot.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {data.snapshot.cycle_name
                    ? `Ciclo: ${data.snapshot.cycle_name}`
                    : "Sem ciclo vinculado"}{" "}
                  · {data.placements.length} colaboradores
                </p>
              </div>
              <Badge variant="outline" className="gap-1">
                {isLocked && <Lock className="h-3 w-3" />}
                {STATUS_LABEL[data.snapshot.status]}
              </Badge>
            </header>

            {isLocked && (
              <Card className="border-warning/40 bg-warning/5">
                <CardContent className="flex items-start gap-3 py-3">
                  <Info className="h-4 w-4 text-warning mt-0.5" />
                  <p className="text-xs">
                    Este snapshot está {data.snapshot.status === "finalized" ? "finalizado" : "arquivado"}.
                    Para editar, volte e reabra como rascunho.
                  </p>
                </CardContent>
              </Card>
            )}

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                <div>
                  <NineBoxGrid
                    placements={data.placements}
                    disabled={isLocked}
                    onRemove={handleRemove}
                  />
                </div>
                <NineBoxPool users={data.pool} disabled={isLocked} />
              </div>
            </DndContext>
          </>
        )}
      </div>
    </AppLayout>
  );
}
