import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeletons de página padrão.
 *
 * Use como estado de `isLoading` no nível da página — NUNCA um `Loader2`
 * ocupando a tela inteira. Compõe com o fluxo obrigatório de estados de query:
 *   if (isLoading) return <ListPageSkeleton />;
 *   if (isError)   return <QueryError onRetry={refetch} />;
 *   if (!data?.length) return <EmptyState ... />;
 */

function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

/** Cabeçalho + N linhas (lista/tabela). */
export function ListPageSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      <HeaderSkeleton />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Cabeçalho + grid responsivo de cards (grid 3 por padrão). */
export function CardsPageSkeleton({
  cards = 3,
  className,
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      <HeaderSkeleton />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Cabeçalho + 2 blocos (página de detalhe). */
export function DetailPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <HeaderSkeleton />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
