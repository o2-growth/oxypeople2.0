import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMinhasNotasFinais } from "@/hooks/useNotaFinal";
import { attitudeLabel } from "@/lib/performance/attitudes";

/**
 * A nota final do ciclo e os ciclos anteriores.
 *
 * É o número que sai da calibragem — o resultado do processo, não a média das
 * avaliações soltas que a pessoa já via. Só aparece depois de publicado: até
 * lá, o número é rascunho da conversa do comitê.
 *
 * O histórico inclui o que veio do Feedz, porque é a mesma tabela: quem já era
 * da casa em 2025 vê a linha do tempo inteira, não só o que nasceu aqui.
 */
export function MinhaNotaFinal({ userId }: { userId?: string }) {
  const { data, isLoading } = useMinhasNotasFinais(userId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.length) return null;

  const [atual, ...anteriores] = data;
  const periodo = (inicio: string | null, fim: string | null) =>
    fim ? format(parseISO(fim), "MMM/yyyy", { locale: ptBR }) : inicio ?? "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-primary" />
              Sua nota final
            </CardTitle>
            <CardDescription>
              O resultado do ciclo depois da calibragem entre os líderes
            </CardDescription>
          </div>
          {atual.score != null && (
            <div className="shrink-0 text-right">
              <p className="text-3xl font-bold tabular-nums">{atual.score.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{attitudeLabel(atual.score)}</p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-sm font-medium">{atual.cicloNome}</p>
          <p className="text-xs text-muted-foreground">
            {periodo(atual.inicio, atual.fim)}
            {atual.publishedAt &&
              ` · publicada em ${format(parseISO(atual.publishedAt), "dd/MM/yyyy")}`}
          </p>
        </div>

        {anteriores.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ciclos anteriores
            </p>
            <div className="space-y-1.5">
              {anteriores.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{n.cicloNome}</p>
                    <p className="text-xs text-muted-foreground">
                      {periodo(n.inicio, n.fim)}
                      {/* Avaliação anterior ao OxyPeople: dizer de onde veio evita
                          a leitura de que o número foi calculado aqui. */}
                      {n.origem === "feedz_import" && " · importada do Feedz"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {n.score?.toFixed(2) ?? "—"}
                    </span>
                    {n.score != null && (
                      <Badge variant="secondary" className="text-[10px]">
                        {attitudeLabel(n.score)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
