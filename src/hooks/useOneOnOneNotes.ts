import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

export type NoteVisibility = "shared" | "private_leader" | "private_member";

export interface NoteRow {
  id: string;
  one_on_one_id: string;
  author_id: string;
  content: string;
  visibility: NoteVisibility;
  created_at: string;
  updated_at: string;
  author: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

const key = (id: string) => ["one-on-one-notes", id];

export function useOneOnOneNotes(oneOnOneId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  const list = useQuery({
    queryKey: key(oneOnOneId),
    queryFn: async (): Promise<NoteRow[]> => {
      const { data, error } = await supabase
        .from("one_on_one_notes")
        .select("*, author:users!one_on_one_notes_author_id_fkey(id, full_name, avatar_url)")
        .eq("one_on_one_id", oneOnOneId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as NoteRow[];
    },
    enabled: !!oneOnOneId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key(oneOnOneId) });

  const addNote = useMutation({
    mutationFn: async ({ content, visibility }: { content: string; visibility: NoteVisibility }) => {
      const { data, error } = await supabase
        .from("one_on_one_notes")
        .insert({ one_on_one_id: oneOnOneId, author_id: userId, content: content.trim(), visibility })
        .select("*, author:users!one_on_one_notes_author_id_fkey(id, full_name, avatar_url)")
        .single();
      if (error) throw error;
      return data as unknown as NoteRow;
    },
    onMutate: async ({ content, visibility }) => {
      await queryClient.cancelQueries({ queryKey: key(oneOnOneId) });
      const prev = queryClient.getQueryData<NoteRow[]>(key(oneOnOneId)) ?? [];
      const optimistic: NoteRow = {
        id: `_tmp_${Date.now()}`,
        one_on_one_id: oneOnOneId,
        author_id: userId,
        content: content.trim(),
        visibility,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: null,
      };
      queryClient.setQueryData<NoteRow[]>(key(oneOnOneId), [...prev, optimistic]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key(oneOnOneId), ctx.prev);
      toast.error("Não foi possível salvar nota — tente novamente.");
    },
    onSuccess: (_, { visibility }) => {
      trackEvent("one_on_one_note_created", { visibility });
      invalidate();
    },
  });

  const editContent = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from("one_on_one_notes")
        .update({ content: content.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nota atualizada.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao editar nota."),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("one_on_one_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key(oneOnOneId) });
      const prev = queryClient.getQueryData<NoteRow[]>(key(oneOnOneId)) ?? [];
      queryClient.setQueryData<NoteRow[]>(key(oneOnOneId), prev.filter((n) => n.id !== id));
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key(oneOnOneId), ctx.prev);
      toast.error("Erro ao excluir nota.");
    },
  });

  return { list, addNote, editContent, deleteNote, userId };
}
