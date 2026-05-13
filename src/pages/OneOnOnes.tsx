import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Loader2, Coffee, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOneOnOnes, type OneOnOneRow } from "@/hooks/useOneOnOnes";
import { OneOnOneForm } from "@/components/one-on-ones/OneOnOneForm";
import { OneOnOneList } from "@/components/one-on-ones/OneOnOneList";
import type { OneOnOneFormValues } from "@/lib/validation/oneOnOneSchema";

export default function OneOnOnesPage() {
  const { user } = useAuth();
  const { list, create, update, cancel, complete } = useOneOnOnes();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OneOnOneRow | null>(null);

  const userId = user?.id ?? "";

  const handleSubmit = async (values: OneOnOneFormValues) => {
    if (editTarget) {
      await update.mutateAsync({
        id: editTarget.id,
        scheduled_at: values.scheduled_at,
        duration_minutes: values.duration_minutes,
        location: values.location,
      });
    } else {
      await create.mutateAsync(values);
    }
  };

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (row: OneOnOneRow) => {
    setEditTarget(row);
    setFormOpen(true);
  };

  const isMutating =
    create.isPending || update.isPending || cancel.isPending || complete.isPending;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Coffee className="h-6 w-6" />
              1:1s
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Reuniões recorrentes entre líder e liderado.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Agendar 1:1
          </Button>
        </div>

        {list.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <OneOnOneList
            rows={list.data ?? []}
            currentUserId={userId}
            onEdit={openEdit}
            onCancel={(id, reason) => cancel.mutate({ id, reason })}
            onComplete={(id) => complete.mutate(id)}
            isMutating={isMutating}
          />
        )}
      </div>

      <OneOnOneForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isSubmitting={isMutating}
        editTarget={editTarget}
        currentUserId={userId}
      />
    </AppLayout>
  );
}
