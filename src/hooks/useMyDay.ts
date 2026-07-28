import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useObjectives } from "@/hooks/useObjectives";
import { useOneOnOnes, type OneOnOneRow } from "@/hooks/useOneOnOnes";
import { useFeedbackInbox } from "@/hooks/useFeedbackInbox";
import { useRecognitions } from "@/hooks/useRecognitions";
import { useOkrSettings } from "@/hooks/useCheckins";

/**
 * Agregador LEVE do "Meu Dia" (Onda 3 — §3.2 Home por papel, visão colaborador).
 *
 * NÃO faz fetch novo: apenas compõe hooks já existentes (useObjectives,
 * useOneOnOnes, useFeedbackInbox, useRecognitions, useOkrSettings) e deriva o
 * que o colaborador precisa ver hoje. Cada seção expõe seu próprio
 * loading/error para estados de primeira classe por widget.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_OVERDUE_DAYS = 7;

export interface PendingCheckinKR {
  krId: string;
  krTitle: string;
  objectiveId: string;
  objectiveTitle: string;
  lastCheckinAt: string | null;
}

export interface NextOneOnOne {
  id: string;
  scheduledAt: string;
  counterpart: OneOnOneRow["member"];
  iAmLeader: boolean;
}

export interface MyDayRecognition {
  id: string;
  message: string;
  created_at: string;
  from_user: { id: string; full_name: string | null; avatar_url: string | null };
  badge: { id: string; name: string; emoji: string | null; color: string | null } | null;
}

interface Section<T> {
  data: T;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export interface UseMyDayResult {
  pendingCheckins: Section<PendingCheckinKR[]>;
  nextOneOnOne: Section<NextOneOnOne | null>;
  pendingFeedback: Section<number>;
  recognitions: Section<MyDayRecognition[]>;
}

export function useMyDay(): UseMyDayResult {
  const { user } = useAuth();
  const meId = user?.id ?? null;

  const objectivesQ = useObjectives();
  const oneOnOnesQ = useOneOnOnes().list;
  const feedbackQ = useFeedbackInbox("pending");
  const recognitions = useRecognitions();
  const settingsQ = useOkrSettings();

  const overdueDays = settingsQ.data?.checkin_overdue_days ?? DEFAULT_OVERDUE_DAYS;

  const pendingCheckins = useMemo<PendingCheckinKR[]>(() => {
    if (!meId || !objectivesQ.data) return [];
    const threshold = Date.now() - overdueDays * DAY_MS;
    const result: PendingCheckinKR[] = [];
    for (const obj of objectivesQ.data) {
      if (obj.status === "completed" || obj.status === "canceled") continue;
      for (const kr of obj.key_results ?? []) {
        const ownerId = kr.owner_user_id ?? obj.owner_id;
        if (ownerId !== meId) continue;
        if (kr.status === "completed" || kr.status === "canceled") continue;
        const last = kr.last_checkin_at ? new Date(kr.last_checkin_at).getTime() : null;
        if (last === null || last < threshold) {
          result.push({
            krId: kr.id,
            krTitle: kr.title,
            objectiveId: obj.id,
            objectiveTitle: obj.title,
            lastCheckinAt: kr.last_checkin_at,
          });
        }
      }
    }
    return result;
  }, [meId, objectivesQ.data, overdueDays]);

  const nextOneOnOne = useMemo<NextOneOnOne | null>(() => {
    if (!meId || !oneOnOnesQ.data) return null;
    const now = Date.now();
    const next = oneOnOnesQ.data
      .filter(
        (m) =>
          m.status === "scheduled" &&
          (m.leader_id === meId || m.member_id === meId) &&
          new Date(m.scheduled_at).getTime() >= now,
      )
      .sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
      )[0];
    if (!next) return null;
    const iAmLeader = next.leader_id === meId;
    return {
      id: next.id,
      scheduledAt: next.scheduled_at,
      counterpart: iAmLeader ? next.member : next.leader,
      iAmLeader,
    };
  }, [meId, oneOnOnesQ.data]);

  const recentRecognitions = useMemo<MyDayRecognition[]>(
    () =>
      (recognitions.received ?? []).slice(0, 3).map((r) => ({
        id: r.id,
        message: r.message,
        created_at: r.created_at,
        from_user: r.from_user,
        badge: r.badge,
      })),
    [recognitions.received],
  );

  return {
    pendingCheckins: {
      data: pendingCheckins,
      isLoading: objectivesQ.isLoading || settingsQ.isLoading,
      isError: objectivesQ.isError,
      refetch: () => objectivesQ.refetch(),
    },
    nextOneOnOne: {
      data: nextOneOnOne,
      isLoading: oneOnOnesQ.isLoading,
      isError: oneOnOnesQ.isError,
      refetch: () => oneOnOnesQ.refetch(),
    },
    pendingFeedback: {
      data: feedbackQ.data?.length ?? 0,
      isLoading: feedbackQ.isLoading,
      isError: feedbackQ.isError,
      refetch: () => feedbackQ.refetch(),
    },
    recognitions: {
      data: recentRecognitions,
      isLoading: recognitions.isLoadingReceived,
      isError: recognitions.isErrorReceived,
      refetch: () => recognitions.refetchReceived(),
    },
  };
}
