import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

export interface TopicRow {
  id: string;
  one_on_one_id: string;
  created_by: string;
  content: string;
  done: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

const key = (id: string) => ["one-on-one-topics", id];

export function useOneOnOneTopics(oneOnOneId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  const list = useQuery({
    queryKey: key(oneOnOneId),
    queryFn: async (): Promise<TopicRow[]> => {
      const { data, error } = await supabase
        .from("one_on_one_topics")
        .select("*")
        .eq("one_on_one_id", oneOnOneId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!oneOnOneId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key(oneOnOneId) });

  const addTopic = useMutation({
    mutationFn: async (content: string) => {
      const current = queryClient.getQueryData<TopicRow[]>(key(oneOnOneId)) ?? [];
      const maxIndex = current.reduce((m, t) => Math.max(m, t.order_index), -1);
      const { data, error } = await supabase
        .from("one_on_one_topics")
        .insert({
          one_on_one_id: oneOnOneId,
          created_by: userId,
          content: content.trim(),
          done: false,
          order_index: maxIndex + 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TopicRow;
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: key(oneOnOneId) });
      const prev = queryClient.getQueryData<TopicRow[]>(key(oneOnOneId)) ?? [];
      const maxIndex = prev.reduce((m, t) => Math.max(m, t.order_index), -1);
      const optimistic: TopicRow = {
        id: `_tmp_${Date.now()}`,
        one_on_one_id: oneOnOneId,
        created_by: userId,
        content: content.trim(),
        done: false,
        order_index: maxIndex + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      queryClient.setQueryData<TopicRow[]>(key(oneOnOneId), [...prev, optimistic]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key(oneOnOneId), ctx.prev);
      toast.error("Erro ao adicionar tópico.");
    },
    onSuccess: () => {
      trackEvent("one_on_one_topic_added");
      invalidate();
    },
  });

  const toggleDone = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("one_on_one_topics")
        .update({ done })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: key(oneOnOneId) });
      const prev = queryClient.getQueryData<TopicRow[]>(key(oneOnOneId)) ?? [];
      queryClient.setQueryData<TopicRow[]>(
        key(oneOnOneId),
        prev.map((t) => (t.id === id ? { ...t, done } : t)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key(oneOnOneId), ctx.prev);
      toast.error("Erro ao atualizar tópico.");
    },
  });

  const editContent = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from("one_on_one_topics")
        .update({ content: content.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tópico atualizado.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao editar tópico."),
  });

  const deleteTopic = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("one_on_one_topics").delete().eq("id", id);
      if (error) {
        if (error.message.includes("policy")) {
          throw new Error("Apenas quem criou o tópico pode deletá-lo.");
        }
        throw error;
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key(oneOnOneId) });
      const prev = queryClient.getQueryData<TopicRow[]>(key(oneOnOneId)) ?? [];
      queryClient.setQueryData<TopicRow[]>(key(oneOnOneId), prev.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (err: Error, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key(oneOnOneId), ctx.prev);
      toast.error(err.message ?? "Erro ao deletar tópico.");
    },
  });

  const reorder = useMutation({
    mutationFn: async (reordered: TopicRow[]) => {
      const updates = reordered.map((t, i) =>
        supabase.from("one_on_one_topics").update({ order_index: i }).eq("id", t.id),
      );
      await Promise.all(updates);
    },
    onMutate: async (reordered) => {
      await queryClient.cancelQueries({ queryKey: key(oneOnOneId) });
      const prev = queryClient.getQueryData<TopicRow[]>(key(oneOnOneId));
      queryClient.setQueryData<TopicRow[]>(
        key(oneOnOneId),
        reordered.map((t, i) => ({ ...t, order_index: i })),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key(oneOnOneId), ctx.prev);
      toast.error("Erro ao reordenar tópicos.");
    },
    onSuccess: () => {
      trackEvent("one_on_one_topics_reordered");
      invalidate();
    },
  });

  return { list, addTopic, toggleDone, editContent, deleteTopic, reorder, userId };
}
