import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  getFirstCollision,
  KeyboardCode,
  type DragEndEvent,
  type Announcements,
  type DroppableContainer,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Grid3X3, Lock, Info } from "lucide-react";
import { toast } from "sonner";
import { useNineBoxSnapshot } from "@/hooks/useNineBoxSnapshot";
import { usePlacementMutations } from "@/hooks/usePlacementMutations";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryError } from "@/components/QueryError";
import { EmptyState } from "@/components/ui/empty-state";
import { NineBoxGrid } from "@/components/admin/nineBox/NineBoxGrid";
import { NineBoxPool } from "@/components/admin/nineBox/NineBoxPool";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  finalized: "Finalizado — somente leitura",
  archived: "Arquivado — somente leitura",
};

const KEYBOARD_DIRECTIONS: string[] = [
  KeyboardCode.Down,
  KeyboardCode.Right,
  KeyboardCode.Up,
  KeyboardCode.Left,
];

/**
 * Getter de coordenadas para navegação por teclado na matriz Nine Box.
 *
 * O @dnd-kit só traz o `PointerSensor` por padrão (mouse/touch). Este getter
 * habilita o `KeyboardSensor`: as setas movem o card focado para a célula (ou
 * pool) adjacente na direção pressionada — em vez do passo fixo de 25px do
 * getter padrão —, centralizando-o no alvo. Espaço/Enter pega e solta; Esc cancela.
 */
const nineBoxKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { context: { active, droppableRects, droppableContainers, collisionRect } },
) => {
  if (!KEYBOARD_DIRECTIONS.includes(event.code)) return undefined;
  event.preventDefault();
  if (!active || !collisionRect) return undefined;

  const candidates: DroppableContainer[] = [];
  droppableContainers.getEnabled().forEach((entry) => {
    if (!entry || entry.disabled) return;
    const rect = droppableRects.get(entry.id);
    if (!rect) return;
    switch (event.code) {
      case KeyboardCode.Down:
        if (collisionRect.top < rect.top) candidates.push(entry);
        break;
      case KeyboardCode.Up:
        if (collisionRect.top > rect.top) candidates.push(entry);
        break;
      case KeyboardCode.Left:
        if (collisionRect.left > rect.left) candidates.push(entry);
        break;
      case KeyboardCode.Right:
        if (collisionRect.left < rect.left) candidates.push(entry);
        break;
    }
  });

  const collisions = closestCorners({
    active,
    collisionRect,
    droppableRects,
    droppableContainers: candidates,
    pointerCoordinates: null,
  });
  const closestId = getFirstCollision(collisions, "id");
  if (closestId == null) return undefined;

  const newRect = droppableContainers.get(closestId)?.rect.current;
  if (!newRect) return undefined;

  return {
    x: newRect.left + (newRect.width - collisionRect.width) / 2,
    y: newRect.top + (newRect.height - collisionRect.height) / 2,
  };
};

const dndAnnouncements: Announcements = {
  onDragStart() {
    return "Card selecionado. Use as setas para mover entre as células e Espaço para soltar.";
  },
  onDragOver() {
    return "Movendo o card pela matriz.";
  },
  onDragEnd() {
    return "Card reposicionado.";
  },
  onDragCancel() {
    return "Movimento cancelado.";
  },
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
  const { data, isLoading, isError, refetch } = useNineBoxSnapshot(id);
  const { updatePlacement, createPlacement, deletePlacement } = usePlacementMutations();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: nineBoxKeyboardCoordinates }),
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
        <div className="mx-auto max-w-7xl space-y-4 py-2">
          <Skeleton className="h-9 w-40" />
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <Skeleton className="h-[480px] w-full rounded-md" />
            <Skeleton className="h-[480px] w-full rounded-md" />
          </div>
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
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <Skeleton className="h-[480px] w-full rounded-md" />
            <Skeleton className="h-[480px] w-full rounded-md" />
          </div>
        ) : isError ? (
          <Card>
            <QueryError
              message="Não foi possível carregar este snapshot."
              onRetry={refetch}
            />
          </Card>
        ) : !data?.snapshot ? (
          <Card>
            <EmptyState
              icon={Grid3X3}
              title="Snapshot não encontrado"
              description="Ele pode ter sido removido. Volte para a lista para ver os snapshots disponíveis."
              action={{
                label: "Voltar para lista",
                onClick: () => navigate("/admin/nine-box"),
              }}
            />
          </Card>
        ) : (
          <>
            <PageHeader
              icon={Grid3X3}
              title={data.snapshot.name}
              description={`${
                data.snapshot.cycle_name
                  ? `Ciclo: ${data.snapshot.cycle_name}`
                  : "Sem ciclo vinculado"
              } · ${data.placements.length} colaboradores`}
              actions={
                <Badge variant="outline" className="gap-1">
                  {isLocked && <Lock className="h-3 w-3" />}
                  {STATUS_LABEL[data.snapshot.status]}
                </Badge>
              }
            />

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

            <DndContext
              sensors={sensors}
              onDragEnd={handleDragEnd}
              accessibility={{ announcements: dndAnnouncements }}
            >
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
