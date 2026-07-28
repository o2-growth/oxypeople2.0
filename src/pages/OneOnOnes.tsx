import { useState } from "react";
import { isToday, parseISO, isFuture } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coffee, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOneOnOnes, type OneOnOneRow } from "@/hooks/useOneOnOnes";
import { QueryError } from "@/components/QueryError";
import { TabCountBadge } from "@/components/shared/TabCountBadge";
import { OneOnOneForm } from "@/components/one-on-ones/OneOnOneForm";
import { OneOnOneList } from "@/components/one-on-ones/OneOnOneList";
import { HistoryTab } from "@/components/one-on-ones/HistoryTab";
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

  const scheduled = (list.data ?? []).filter((r) => r.status === "scheduled");
  const todayRows = scheduled.filter((r) => isToday(parseISO(r.scheduled_at)));
  const upcomingRows = scheduled.filter(
    (r) => !isToday(parseISO(r.scheduled_at)) && isFuture(parseISO(r.scheduled_at)),
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <PageHeader
          icon={Coffee}
          title="1:1s"
          description="Reuniões recorrentes entre líder e liderado."
          actions={
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Agendar 1:1
            </Button>
          }
        />

        {list.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : list.isError ? (
          <QueryError
            message="Não foi possível carregar as reuniões 1:1."
            onRetry={() => list.refetch()}
          />
        ) : (
          <Tabs defaultValue={todayRows.length > 0 ? "today" : "upcoming"}>
            <TabsList>
              <TabsTrigger value="upcoming">
                Próximas<TabCountBadge count={upcomingRows.length} />
              </TabsTrigger>
              <TabsTrigger value="today">
                Hoje<TabCountBadge count={todayRows.length} />
              </TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4">
              <OneOnOneList
                rows={upcomingRows}
                currentUserId={userId}
                onEdit={openEdit}
                onCancel={(id, reason) => cancel.mutate({ id, reason })}
                onComplete={(id) => complete.mutate(id)}
                isMutating={isMutating}
              />
            </TabsContent>

            <TabsContent value="today" className="mt-4">
              <OneOnOneList
                rows={todayRows}
                currentUserId={userId}
                onEdit={openEdit}
                onCancel={(id, reason) => cancel.mutate({ id, reason })}
                onComplete={(id) => complete.mutate(id)}
                isMutating={isMutating}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <HistoryTab currentUserId={userId} />
            </TabsContent>
          </Tabs>
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
