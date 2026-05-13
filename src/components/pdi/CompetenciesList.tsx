import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CompetencyForm } from "./CompetencyForm";
import { usePDICompetencies, type PDICompetency } from "@/hooks/usePDICompetencies";

interface Props {
  planId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Técnica",
  leadership: "Liderança",
  behavioral: "Comportamental",
  other: "Outra",
};

const MAX_COMPETENCIES = 8;

export function CompetenciesList({ planId }: Props) {
  const { list, add, edit, remove } = usePDICompetencies(planId);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PDICompetency | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PDICompetency | null>(null);

  const competencies = list.data ?? [];
  const atLimit = competencies.length >= MAX_COMPETENCIES;

  const openAdd = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (c: PDICompetency) => {
    setEditTarget(c);
    setFormOpen(true);
  };

  const handleSubmit = async (input: Parameters<typeof add.mutateAsync>[0]) => {
    if (editTarget) {
      await edit.mutateAsync({ id: editTarget.id, ...input });
    } else {
      await add.mutateAsync(input);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Competências ({competencies.length}/{MAX_COMPETENCIES})
        </h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={openAdd}
                disabled={atLimit}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar competência
              </Button>
            </span>
          </TooltipTrigger>
          {atLimit && (
            <TooltipContent>Limite de 8 competências</TooltipContent>
          )}
        </Tooltip>
      </div>

      {competencies.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Nenhuma competência ainda. Adicione pelo menos uma para ativar o PDI.
        </p>
      ) : (
        <div className="space-y-2">
          {competencies.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{c.name}</span>
                  {c.category && (
                    <Badge variant="secondary" className="text-xs">
                      {CATEGORY_LABELS[c.category] ?? c.category}
                    </Badge>
                  )}
                </div>
                {c.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {c.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Nível {c.current_level} → {c.target_level}
                </p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => openEdit(c)}
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 hover:text-destructive"
                  onClick={() => setDeleteTarget(c)}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CompetencyForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
        onSubmit={handleSubmit}
        isSubmitting={add.isPending || edit.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover competência?</AlertDialogTitle>
            <AlertDialogDescription>
              Ações vinculadas perderão o vínculo (mas serão preservadas).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) remove.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
