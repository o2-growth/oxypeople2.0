import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityItem } from "./ActivityItem";
import { useRecentActivity } from "@/hooks/useRecentActivity";
import { Skeleton } from "@/components/ui/skeleton";

export function RecentActivity() {
  const { data: activities, isLoading } = useRecentActivity(5);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : activities && activities.length > 0 ? (
          activities.map((activity) => (
            <ActivityItem key={activity.id} {...activity} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma atividade recente
          </p>
        )}
      </CardContent>
    </Card>
  );
}
