import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OkrDraft } from "@/lib/okr/draft-contract";

/**
 * Pede ao copiloto uma proposta de OKR a partir do texto do líder.
 *
 * Não grava nada: devolve a proposta para o formulário que já existe. Quem
 * salva continua sendo o `useCreateObjective`, com as mesmas regras e RLS.
 */
export function useOkrDraft() {
  return useMutation<OkrDraft, Error, string>({
    mutationFn: async (texto: string) => {
      const { data, error } = await supabase.functions.invoke("okr-copilot", {
        body: { texto },
      });

      // A function responde com `error` no corpo em pt-BR; o invoke devolve
      // só "non-2xx status", que não diz nada a quem está na tela.
      if (error) {
        const doServidor = await lerMensagem(error);
        throw new Error(doServidor ?? "Não foi possível falar com o copiloto.");
      }
      if (!data?.proposta) {
        throw new Error(data?.error ?? "O copiloto não devolveu uma proposta.");
      }
      return data.proposta as OkrDraft;
    },
    onError: (e) => toast.error("Copiloto", { description: e.message }),
  });
}

/** A mensagem útil vem no corpo da resposta, não no erro do supabase-js. */
async function lerMensagem(error: unknown): Promise<string | null> {
  const ctx = (error as { context?: Response })?.context;
  if (!ctx || typeof ctx.json !== "function") return (error as Error)?.message ?? null;
  try {
    const corpo = await ctx.json();
    return corpo?.error ?? null;
  } catch {
    return (error as Error)?.message ?? null;
  }
}
