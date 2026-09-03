import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Palmtree } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { TimeOffPanel } from "@/components/time-off/TimeOffPanel";

/**
 * Rota própria de Férias, mantida porque o link já circula e está no menu.
 * O painel em si vive em TimeOffPanel e é o mesmo que a aba Férias do RH usa.
 */
export default function TimeOffPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: permsLoading } = useUserPermissions();

  useEffect(() => {
    if (!permsLoading && !isAdmin) {
      toast.error("Sem permissão para acessar Férias.");
      navigate("/", { replace: true });
    }
  }, [isAdmin, permsLoading, navigate]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Palmtree}
          title="Férias / Ausências"
          description="Controle de férias e suspensão de contrato (PJ) — visão administrativa."
        />
        <TimeOffPanel />
      </div>
    </AppLayout>
  );
}
