import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useUserPermissions } from "@/hooks/useUserPermissions";

interface UseRequireAdminOptions {
  /** Mensagem do toast exibido a quem não é admin. */
  message?: string;
  /** Rota de redirecionamento (padrão: "/"). */
  redirectTo?: string;
}

/**
 * Gate de rota admin: redireciona quem não é admin (com toast) e devolve o
 * estado de permissão para a página decidir seu próprio loading/render.
 *
 * Consolida o `useEffect(() => { if (!permsLoading && !isAdmin) { toast…;
 * navigate… } })` copiado em ~9 páginas de `admin/*`.
 */
export function useRequireAdmin(options: UseRequireAdminOptions = {}) {
  const { message = "Sem permissão para acessar esta página.", redirectTo = "/" } =
    options;
  const { isAdmin, isLoading } = useUserPermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      toast.error(message);
      navigate(redirectTo, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isLoading, navigate]);

  return { isAdmin, isLoading };
}
