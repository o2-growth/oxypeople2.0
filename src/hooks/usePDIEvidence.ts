import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import type { PDIAction } from "@/hooks/usePDIActions";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "video/mp4",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function validateFile(file: File) {
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("Arquivo muito grande (max 10 MB)");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Tipo não suportado");
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function useUploadEvidence(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, action }: { file: File; action: PDIAction }) => {
      validateFile(file);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const uid = session.user.id;
      const uuid = crypto.randomUUID();
      const sanitized = sanitizeFilename(file.name);
      const path = `${uid}/${planId}/${action.id}/${uuid}-${sanitized}`;

      // Remove old evidence file if exists
      if (action.evidence_url) {
        await supabase.storage.from("pdi-attachments").remove([action.evidence_url]);
      }

      const { error: uploadError } = await supabase.storage
        .from("pdi-attachments")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("pdi_actions")
        .update({ evidence_url: path })
        .eq("id", action.id);
      if (updateError) throw updateError;

      trackEvent("pdi_evidence_uploaded", {
        file_type: file.type,
        file_size_kb: Math.round(file.size / 1024),
      });

      return path;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdi-actions", planId] });
      toast.success("Evidência anexada com sucesso.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useDeleteEvidence(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action }: { action: PDIAction }) => {
      if (!action.evidence_url) return;

      const { error: removeError } = await supabase.storage
        .from("pdi-attachments")
        .remove([action.evidence_url]);
      if (removeError) throw removeError;

      const { error: updateError } = await supabase
        .from("pdi_actions")
        .update({ evidence_url: null })
        .eq("id", action.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdi-actions", planId] });
      toast.success("Evidência removida.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useGetSignedUrl() {
  return async (path: string, isOwner: boolean): Promise<string> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (isOwner) {
      const { data, error } = await supabase.storage
        .from("pdi-attachments")
        .createSignedUrl(path, 60);
      if (error) throw error;
      return data.signedUrl;
    }

    if (!session) throw new Error("Não autenticado");

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pdi-evidence-signed-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ path }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Erro ao obter URL de evidência");
    }

    const data = await response.json();
    return data.signedUrl as string;
  };
}
