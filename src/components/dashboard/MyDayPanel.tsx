import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import NumberFlow from "@number-flow/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Target,
  CalendarClock,
  MessageSquare,
  Trophy,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMyDay } from "@/hooks/useMyDay";

/** Erro compacto por tile (o QueryError de página é grande demais p/ um card). */
function TileError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-2 py-1">
      <p className="text-xs text-muted-foreground">Não foi possível carregar.</p>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 px-2 text-xs"
        onClick={onRetry}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Tentar de novo
      </Button>
    </div>
  );
}

function TileShell({
  icon,
  title,
  children,
  footer,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className="text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <div>{children}</div>
        {footer ? <div className="pt-1">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

function TileLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {label}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

export function MyDayPanel() {
  const { pendingCheckins, nextOneOnOne, pendingFeedback, recognitions } = useMyDay();

  return (
    <section className="space-y-4" aria-label="Meu Dia">
      <div>
        <h2 className="text-base font-semibold">Meu Dia</h2>
        <p className="text-sm text-muted-foreground">
          O que precisa da sua atenção hoje.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Check-ins pendentes */}
        <TileShell
          icon={<Target />}
          title="Check-ins pendentes"
          footer={<TileLink to="/objectives" label="Ver objetivos" />}
        >
          {pendingCheckins.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-12" />
              <Skeleton className="h-3 w-32" />
            </div>
          ) : pendingCheckins.isError ? (
            <TileError onRetry={pendingCheckins.refetch} />
          ) : pendingCheckins.data.length === 0 ? (
            <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Tudo em dia!
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-3xl font-bold leading-none">
                <NumberFlow value={pendingCheckins.data.length} />
              </p>
              <ul className="space-y-1">
                {pendingCheckins.data.slice(0, 2).map((kr) => (
                  <li key={kr.krId} className="truncate text-xs text-muted-foreground">
                    {kr.krTitle}
                  </li>
                ))}
                {pendingCheckins.data.length > 2 ? (
                  <li className="text-xs text-muted-foreground">
                    +{pendingCheckins.data.length - 2} outros
                  </li>
                ) : null}
              </ul>
            </div>
          )}
        </TileShell>

        {/* Próxima 1:1 */}
        <TileShell
          icon={<CalendarClock />}
          title="Próxima 1:1"
          footer={<TileLink to="/one-on-ones" label="Ver 1:1s" />}
        >
          {nextOneOnOne.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          ) : nextOneOnOne.isError ? (
            <TileError onRetry={nextOneOnOne.refetch} />
          ) : nextOneOnOne.data ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold capitalize">
                {format(parseISO(nextOneOnOne.data.scheduledAt), "EEE, dd MMM · HH:mm", {
                  locale: ptBR,
                })}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                com {nextOneOnOne.data.counterpart?.full_name ?? "—"}
              </p>
            </div>
          ) : (
            <p className="py-1 text-sm text-muted-foreground">Nenhuma agendada.</p>
          )}
        </TileShell>

        {/* Feedbacks a responder */}
        <TileShell
          icon={<MessageSquare />}
          title="Feedbacks a responder"
          footer={<TileLink to="/feedback?tab=inbox" label="Abrir inbox" />}
        >
          {pendingFeedback.isLoading ? (
            <Skeleton className="h-9 w-12" />
          ) : pendingFeedback.isError ? (
            <TileError onRetry={pendingFeedback.refetch} />
          ) : pendingFeedback.data === 0 ? (
            <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Nada pendente.
            </div>
          ) : (
            <p className="text-3xl font-bold leading-none">
              <NumberFlow value={pendingFeedback.data} />
            </p>
          )}
        </TileShell>

        {/* Reconhecimentos recentes */}
        <TileShell
          icon={<Trophy />}
          title="Reconhecimentos"
          footer={<TileLink to="/recognition" label="Ver reconhecimentos" />}
        >
          {recognitions.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          ) : recognitions.isError ? (
            <TileError onRetry={recognitions.refetch} />
          ) : recognitions.data.length === 0 ? (
            <p className="py-1 text-sm text-muted-foreground">Nenhum ainda.</p>
          ) : (
            <ul className="space-y-2">
              {recognitions.data.slice(0, 2).map((rec) => {
                const initials =
                  rec.from_user?.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2) || "?";
                return (
                  <li key={rec.id} className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={rec.from_user?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {rec.badge?.emoji ? `${rec.badge.emoji} ` : ""}
                        {rec.from_user?.full_name ?? "Alguém"}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {rec.message}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TileShell>
      </div>
    </section>
  );
}
