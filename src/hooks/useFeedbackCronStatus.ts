import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

export function useFeedbackCronStatus() {
  const [lastRunCount, setLastRunCount] = useState<number | null>(null);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  const forceExpire = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("expire_feedback_requests");
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      setLastRunCount(count);
      setLastRunAt(new Date());
      trackEvent("feedback_expire_manual_run", { count });
      toast.success(
        count === 0
          ? "Nenhum pedido expirado — tudo em dia."
          : `${count} pedido${count > 1 ? "s" : ""} marcado${count > 1 ? "s" : ""} como expirado.`,
      );
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao executar expiração.");
    },
  });

  return { forceExpire, lastRunCount, lastRunAt };
}
