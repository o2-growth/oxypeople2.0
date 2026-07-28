import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QueryError } from "@/components/QueryError";
import { DetailPageSkeleton } from "@/components/ui/page-skeleton";
import { ONE_ON_ONE_STATUS } from "@/components/shared/StatusBadge";
import { Coffee, ArrowLeft, MapPin, Clock, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TopicsPanel } from "@/components/one-on-ones/TopicsPanel";
import { NotesPanel } from "@/components/one-on-ones/NotesPanel";
import { PreviousMeetings } from "@/components/one-on-ones/PreviousMeetings";
import { DownloadIcsButton } from "@/components/one-on-ones/DownloadIcsButton";
import { useOneOnOneDetail } from "@/hooks/useOneOnOneDetail";

export default function OneOnOneDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data: row, isLoading, isError, refetch } = useOneOnOneDetail(id);

  if (isLoading) {
    return (
      <AppLayout>
        <DetailPageSkeleton className="max-w-2xl" />
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <QueryError message="Não foi possível carregar a 1:1." onRetry={() => refetch()} />
      </AppLayout>
    );
  }

  if (!row) {
    return (
      <AppLayout>
        <div className="py-16 text-center text-muted-foreground">
          <Coffee className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">1:1 não encontrada ou sem acesso.</p>
          <Button variant="ghost" className="mt-4 gap-1.5" onClick={() => navigate("/one-on-ones")}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const isLeader = userId === row.leader_id;
  const leaderName = row.leader?.full_name ?? "Líder";
  const memberName = row.member?.full_name ?? "Liderado";
  const dateStr = format(parseISO(row.scheduled_at), "EEEE, d 'de' MMMM yyyy 'às' HH:mm", { locale: ptBR });
  const status = ONE_ON_ONE_STATUS[row.status] ?? { label: row.status, variant: "outline" as const };

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" onClick={() => navigate("/one-on-ones")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold leading-tight flex items-center gap-2 flex-wrap">
              <Coffee className="h-5 w-5 shrink-0" />
              {leaderName} × {memberName}
            </h1>
            <p className="text-sm text-muted-foreground capitalize mt-0.5">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <DownloadIcsButton
              meeting={row}
              leader={row.leader ?? { full_name: leaderName }}
              member={row.member ?? { full_name: memberName }}
            />
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {row.duration_minutes} min
          </span>
          {row.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {row.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <User className="h-4 w-4" />
            {leaderName} (líder) · {memberName}
          </span>
        </div>

        {row.canceled_reason && (
          <p className="text-sm text-muted-foreground italic">
            Motivo do cancelamento: {row.canceled_reason}
          </p>
        )}

        <div className="border rounded-lg p-4">
          <TopicsPanel oneOnOneId={row.id} currentUserId={userId} />
        </div>

        <div className="border rounded-lg p-4">
          <NotesPanel oneOnOneId={row.id} currentUserId={userId} isLeader={isLeader} />
        </div>

        <div className="border rounded-lg p-4">
          <PreviousMeetings
            oneOnOneId={row.id}
            leaderId={row.leader_id}
            memberId={row.member_id}
            counterpartName={isLeader ? memberName : leaderName}
          />
        </div>
      </div>
    </AppLayout>
  );
}
