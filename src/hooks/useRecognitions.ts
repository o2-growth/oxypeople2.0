import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./useUser";
import { useAddPoints, useAddPointsForUser } from "./useGamification";
import { toast } from "sonner";

interface Recognition {
  id: string;
  message: string;
  points: number;
  created_at: string;
  from_user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  to_user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  badge: {
    id: string;
    name: string;
    emoji: string | null;
    color: string | null;
  } | null;
}

export function useRecognitions() {
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const addPoints = useAddPoints();
  const addPointsForUser = useAddPointsForUser();

  const recognitionsQuery = useQuery({
    queryKey: ["recognitions", profile?.primary_company_id],
    queryFn: async (): Promise<Recognition[]> => {
      if (!profile?.primary_company_id) return [];

      const { data, error } = await supabase
        .from("recognitions")
        .select(`
          id,
          message,
          points,
          created_at,
          from_user:users!recognitions_from_user_id_fkey(id, full_name, avatar_url),
          to_user:users!recognitions_to_user_id_fkey(id, full_name, avatar_url),
          badge:badges(id, name, emoji, color)
        `)
        .eq("company_id", profile.primary_company_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching recognitions:", error);
        throw error;
      }

      return (data || []).map((rec) => ({
        id: rec.id,
        message: rec.message,
        points: rec.points,
        created_at: rec.created_at,
        from_user: rec.from_user as Recognition["from_user"],
        to_user: rec.to_user as Recognition["to_user"],
        badge: rec.badge as Recognition["badge"],
      }));
    },
    enabled: !!profile?.primary_company_id,
  });

  const myReceivedQuery = useQuery({
    queryKey: ["recognitions", "received", profile?.id],
    queryFn: async (): Promise<Recognition[]> => {
      if (!profile?.id || !profile?.primary_company_id) return [];

      const { data, error } = await supabase
        .from("recognitions")
        .select(`
          id,
          message,
          points,
          created_at,
          from_user:users!recognitions_from_user_id_fkey(id, full_name, avatar_url),
          to_user:users!recognitions_to_user_id_fkey(id, full_name, avatar_url),
          badge:badges(id, name, emoji, color)
        `)
        .eq("company_id", profile.primary_company_id)
        .eq("to_user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((rec) => ({
        id: rec.id,
        message: rec.message,
        points: rec.points,
        created_at: rec.created_at,
        from_user: rec.from_user as Recognition["from_user"],
        to_user: rec.to_user as Recognition["to_user"],
        badge: rec.badge as Recognition["badge"],
      }));
    },
    enabled: !!profile?.id && !!profile?.primary_company_id,
  });

  const mySentQuery = useQuery({
    queryKey: ["recognitions", "sent", profile?.id],
    queryFn: async (): Promise<Recognition[]> => {
      if (!profile?.id || !profile?.primary_company_id) return [];

      const { data, error } = await supabase
        .from("recognitions")
        .select(`
          id,
          message,
          points,
          created_at,
          from_user:users!recognitions_from_user_id_fkey(id, full_name, avatar_url),
          to_user:users!recognitions_to_user_id_fkey(id, full_name, avatar_url),
          badge:badges(id, name, emoji, color)
        `)
        .eq("company_id", profile.primary_company_id)
        .eq("from_user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((rec) => ({
        id: rec.id,
        message: rec.message,
        points: rec.points,
        created_at: rec.created_at,
        from_user: rec.from_user as Recognition["from_user"],
        to_user: rec.to_user as Recognition["to_user"],
        badge: rec.badge as Recognition["badge"],
      }));
    },
    enabled: !!profile?.id && !!profile?.primary_company_id,
  });

  const sendRecognition = useMutation({
    mutationFn: async ({
      toUserId,
      badgeId,
      message,
      points,
    }: {
      toUserId: string;
      badgeId: string;
      message: string;
      points: number;
    }) => {
      if (!profile?.id || !profile?.primary_company_id) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase.from("recognitions").insert({
        company_id: profile.primary_company_id,
        from_user_id: profile.id,
        to_user_id: toUserId,
        badge_id: badgeId,
        message,
        points,
      }).select().single();

      if (error) throw error;
      return { ...data, toUserId };
    },
    onSuccess: (data) => {
      toast.success("Reconhecimento enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["recognitions"] });
      queryClient.invalidateQueries({ queryKey: ["top-recognized"] });
      // Add gamification points: sender gets 10 pts, receiver gets 15 pts
      addPoints.mutate({ actionType: "recognition_sent", referenceId: data.id });
      addPointsForUser.mutate({ 
        userId: data.toUserId, 
        actionType: "recognition_received", 
        referenceId: data.id 
      });
    },
    onError: (error) => {
      console.error("Error sending recognition:", error);
      toast.error("Erro ao enviar reconhecimento");
    },
  });

  return {
    recognitions: recognitionsQuery.data || [],
    received: myReceivedQuery.data || [],
    sent: mySentQuery.data || [],
    isLoading: recognitionsQuery.isLoading,
    isLoadingReceived: myReceivedQuery.isLoading,
    isLoadingSent: mySentQuery.isLoading,
    isError: recognitionsQuery.isError,
    isErrorReceived: myReceivedQuery.isError,
    isErrorSent: mySentQuery.isError,
    refetch: recognitionsQuery.refetch,
    refetchReceived: myReceivedQuery.refetch,
    refetchSent: mySentQuery.refetch,
    sendRecognition,
  };
}
