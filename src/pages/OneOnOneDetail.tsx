import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coffee, ArrowLeft, MapPin, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TopicsPanel } from "@/components/one-on-ones/TopicsPanel";
import { NotesPanel } from "@/components/one-on-ones/NotesPanel";
import { PreviousMeetings } from "@/components/one-on-ones/PreviousMeetings";
import { DownloadIcsButton } from "@/components/one-on-ones/DownloadIcsButton";
import type { OneOnOneRow } from "@/hooks/useOneOnOnes";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  scheduled: { label: "Agendada", variant: "default" },
  completed: { label: "Concluída", variant: "secondary" },
  canceled: { label: "Cancelada", variant: "destructive" },
  no_show: { label: "Não realizada", variant: "outline" },
};

export default function OneOnOneDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data: row, isLoading } = useQuery({
    queryKey: ["one-on-one", id],
    queryFn: async (): Promise<OneOnOneRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("one_on_ones")
        .select(`
          id, company_id, leader_id, member_id, scheduled_at, duration_minutes,
          location, status, recurrence, recurrence_parent_id, completed_at,
          canceled_reason, created_at, updated_at,
          leader:users!one_on_ones_leader_id_fkey(id, full_name, avatar_url),
          member:users!one_on_ones_member_id_fkey(id, full_name, avatar_url)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OneOnOneRow | null;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
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
  const status = STATUS_BADGE[row.status] ?? { label: row.status, variant: "outline" as const };

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" onClick={() => navigate("/one-on-ones")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-heading font-bold flex items-center gap-2 flex-wrap">
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
