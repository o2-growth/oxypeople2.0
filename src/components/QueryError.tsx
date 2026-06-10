import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryErrorProps {
  /** Mensagem amigável (PT-BR) descrevendo o que falhou ao carregar. */
  message?: string;
  /** Callback de refetch — normalmente `() => query.refetch()`. */
  onRetry?: () => void;
}

/**
 * Estado de erro padrão para falhas de carregamento de queries.
 * Use quando `isError` for verdadeiro, em vez de mascarar a falha como
 * estado vazio (que confunde o usuário e esconde problemas reais de backend).
 */
export function QueryError({
  message = "Não foi possível carregar os dados.",
  onRetry,
}: QueryErrorProps) {
  return (
    <div className="py-16 text-center text-muted-foreground">
      <AlertCircle className="h-10 w-10 mx-auto mb-3 text-destructive opacity-70" />
      <p className="text-sm">{message}</p>
      <p className="text-xs mt-1 opacity-70">
        Tente novamente. Se persistir, avise o time de suporte.
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-4 gap-1.5" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
