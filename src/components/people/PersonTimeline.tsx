import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Award,
  Briefcase,
  CalendarClock,
  ClipboardCheck,
  ExternalLink,
  History,
  MessageSquareText,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/QueryError";
import {
  useFeedbackAboutMe,
  useFeedbackForTeam,
} from "@/hooks/useFeedbackAboutMe";
import { useTeamPDIs } from "@/hooks/useTeamPDIs";
import { useOneOnOnes, type OneOnOneRow } from "@/hooks/useOneOnOnes";
import { useRecognitions } from "@/hooks/useRecognitions";
import { usePositionHistory, usePersonEvaluations } from "@/hooks/usePersonHistory";
import type { PDIStatus } from "@/hooks/usePDI";

/**
 * Timeline unificada da jornada de uma pessoa (§3.5 — Onda 3).
 *
 * COMPOSIÇÃO de hooks já existentes + agregador leve (useMemo). ZERO query nova:
 * reaproveita `useFeedbackForTeam`/`useFeedbackAboutMe`, `useTeamPDIs`,
 * `useOneOnOnes` e `useRecognitions`, todos já usados em outras telas e todos
 * com RLS aplicada no backend. O componente apenas FILTRA por pessoa e ordena.
 *
 * RLS / visibilidade: o viewer só vê aqui o que já veria nas telas de origem.
 * As 1:1s entram como EVENTO (data + status), nunca o conteúdo de notas privadas
 * — a fonte (`useOneOnOnes`) sequer traz notas. Feedbacks entram apenas os
 * visíveis ao viewer (shared_with_manager / sobre si mesmo).
 */

type TimelineType =
  | "feedback"
  | "pdi"
  | "one_on_one"
  | "recognition"
  | "position"
  | "evaluation";

interface TimelineEntry {
  id: string;
  type: TimelineType;
  /** ISO date usado tanto para ordenar (desc) quanto para exibir. */
  date: string;
  title: string;
  detail?: string;
  href?: string;
}

const TYPE_META: Record<
  TimelineType,
  { label: string; icon: LucideIcon; className: string }
> = {
  feedback: {
    label: "Feedback",
    icon: MessageSquareText,
    className: "bg-accent/10 text-accent",
  },
  pdi: { label: "PDI", icon: Target, className: "bg-primary/10 text-primary" },
  one_on_one: {
    label: "1:1",
    icon: CalendarClock,
    className: "bg-success/10 text-success",
  },
  recognition: {
    label: "Reconhecimento",
    icon: Award,
    className: "bg-warning/10 text-warning",
  },
  position: {
    label: "Cargo",
    icon: Briefcase,
    className: "bg-muted text-muted-foreground",
  },
  evaluation: {
    label: "Avaliação",
    icon: ClipboardCheck,
    className: "bg-primary/10 text-primary",
  },
};

const ONE_ON_ONE_STATUS: Record<OneOnOneRow["status"], string> = {
  scheduled: "agendada",
  completed: "realizada",
  canceled: "cancelada",
  no_show: "sem comparecimento",
};

const PDI_STATUS_LABEL: Record<PDIStatus, string> = {
  draft: "Rascunho",
  active: "Em andamento",
  completed: "Concluído",
  canceled: "Cancelado",
};

/** Converte string em ISO válido ou `null` (nunca quebra a timeline). */
function toISO(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

interface PersonTimelineProps {
  /** userId da pessoa dona da jornada. */
  userId: string | null | undefined;
  className?: string;
}

export function PersonTimeline({ userId, className }: PersonTimelineProps) {
  const feedbackTeam = useFeedbackForTeam();
  const feedbackMe = useFeedbackAboutMe();
  const reportIds = useMemo(() => (userId ? [userId] : []), [userId]);
  const pdiQuery = useTeamPDIs(reportIds);
  const { list: oneOnOnes } = useOneOnOnes();
  const recognitions = useRecognitions();
  const positions = usePositionHistory(userId);
  const evaluations = usePersonEvaluations(userId);

  const entries = useMemo<TimelineEntry[]>(() => {
    if (!userId) return [];
    const items: TimelineEntry[] = [];

    // 1. Feedbacks recebidos (só os visíveis ao viewer). Combina as duas fontes
    //    viewer-scoped e deduplica por id.
    const seenFeedback = new Set<string>();
    for (const f of [...(feedbackTeam.data ?? []), ...(feedbackMe.data ?? [])]) {
      if (f.subject?.id !== userId || seenFeedback.has(f.id)) continue;
      const iso = toISO(f.answered_at ?? f.created_at);
      if (!iso) continue;
      seenFeedback.add(f.id);
      const author = f.respondent?.full_name?.trim();
      items.push({
        id: `feedback-${f.id}`,
        type: "feedback",
        date: iso,
        title: "Feedback recebido",
        detail: author
          ? `de ${author}`
          : f.competency_tags[0] || undefined,
        href: `/feedback/${f.id}`,
      });
    }

    // 2. PDI da pessoa (plano mais recente — o que o hook existente expõe).
    const pdi = pdiQuery.data?.[userId];
    if (pdi) {
      const iso = toISO(pdi.created_at);
      if (iso) {
        items.push({
          id: `pdi-${pdi.id}`,
          type: "pdi",
          date: iso,
          title: pdi.title || "PDI",
          detail: PDI_STATUS_LABEL[pdi.status],
          href: `/pdi/${pdi.id}`,
        });
      }
    }

    // 3. 1:1s da pessoa — o EVENTO (data + status), nunca as notas privadas.
    for (const o of oneOnOnes.data ?? []) {
      if (o.member_id !== userId && o.leader_id !== userId) continue;
      const iso = toISO(o.scheduled_at);
      if (!iso) continue;
      const counterpart = o.member_id === userId ? o.leader : o.member;
      items.push({
        id: `one-on-one-${o.id}`,
        type: "one_on_one",
        date: iso,
        title: `1:1 ${ONE_ON_ONE_STATUS[o.status]}`,
        detail: counterpart?.full_name ? `com ${counterpart.full_name}` : undefined,
        href: `/one-on-ones/${o.id}`,
      });
    }

    // 4. Reconhecimentos recebidos (mural público da empresa).
    for (const r of recognitions.recognitions) {
      if (r.to_user?.id !== userId) continue;
      const iso = toISO(r.created_at);
      if (!iso) continue;
      const badgeName = r.badge?.name
        ? `${r.badge.emoji ? `${r.badge.emoji} ` : ""}${r.badge.name}`
        : "Reconhecimento";
      items.push({
        id: `recognition-${r.id}`,
        type: "recognition",
        date: iso,
        title: badgeName,
        detail: r.from_user?.full_name ? `de ${r.from_user.full_name}` : undefined,
      });
    }

    // 5. Movimentações de cargo e saída (Pipefy + importação do Feedz).
    for (const p of positions.data ?? []) {
      const iso = toISO(p.changed_at);
      if (!iso) continue;
      const saida = p.notes?.startsWith("Turnover");
      const partes = [p.position, p.department_name].filter(Boolean).join(" · ");
      items.push({
        id: `position-${p.id}`,
        type: "position",
        date: iso,
        title: saida ? "Saída da empresa" : partes || "Mudança de cargo",
        detail: saida ? p.reason ?? undefined : p.manager_name ? `gestor: ${p.manager_name}` : undefined,
      });
    }

    // 6. Avaliações de desempenho concluídas — a nota, não as respostas.
    for (const e of evaluations.data ?? []) {
      const iso = toISO(e.completed_at ?? e.due_date);
      if (!iso) continue;
      items.push({
        id: `evaluation-${e.id}`,
        type: "evaluation",
        date: iso,
        title: e.cycle?.name || "Avaliação de desempenho",
        detail: e.overall_score != null ? `nota ${e.overall_score.toFixed(2)}` : undefined,
      });
    }

    // Ordem cronológica decrescente (ISO ordena lexicograficamente = temporal).
    items.sort((a, b) => b.date.localeCompare(a.date));
    return items;
  }, [
    userId,
    feedbackTeam.data,
    feedbackMe.data,
    pdiQuery.data,
    oneOnOnes.data,
    recognitions.recognitions,
    positions.data,
    evaluations.data,
  ]);

  const isLoading =
    feedbackTeam.isLoading ||
    feedbackMe.isLoading ||
    pdiQuery.isLoading ||
    oneOnOnes.isLoading ||
    recognitions.isLoading;

  const isError =
    feedbackTeam.isError ||
    feedbackMe.isError ||
    pdiQuery.isError ||
    oneOnOnes.isError ||
    recognitions.isError;

  const handleRetry = () => {
    feedbackTeam.refetch();
    feedbackMe.refetch();
    pdiQuery.refetch();
    oneOnOnes.refetch();
    recognitions.refetch();
  };

  if (!userId) return null;

  if (isLoading && entries.length === 0) {
    return <TimelineSkeleton className={className} />;
  }

  if (isError && entries.length === 0) {
    return (
      <QueryError
        message="Não foi possível carregar a jornada."
        onRetry={handleRetry}
      />
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Sem atividade ainda"
        description="Feedbacks, PDIs, 1:1s e reconhecimentos aparecem aqui conforme acontecem."
        className="py-10"
      />
    );
  }

  return (
    <ol role="list" className={cn("space-y-3", className)}>
      {entries.map((entry) => {
        const meta = TYPE_META[entry.type];
        const Icon = meta.icon;
        const body = (
          <>
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium text-foreground">
                {entry.title}
              </span>
              {entry.href ? (
                <ExternalLink
                  className="h-3 w-3 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              <span>{meta.label}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={entry.date}>
                {format(new Date(entry.date), "d 'de' MMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </time>
              {entry.detail ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{entry.detail}</span>
                </>
              ) : null}
            </div>
          </>
        );

        return (
          <li key={entry.id} className="flex gap-3">
            <span
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                meta.className,
              )}
              aria-hidden="true"
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              {entry.href ? (
                <Link
                  to={entry.href}
                  className="-mx-1 block rounded-md px-1 py-0.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {body}
                </Link>
              ) : (
                <div className="px-1 py-0.5">{body}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TimelineSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5 py-0.5">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
