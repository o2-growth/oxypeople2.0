import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Plus, User, Building2, LayoutGrid } from "lucide-react";
import { MyOkrsView } from "@/components/objectives/MyOkrsView";
import { CompanyOkrsList } from "@/components/objectives/CompanyOkrsList";
import { ObjectivesBoard } from "@/components/objectives/ObjectivesBoard";
import { CreateObjectiveDialog } from "@/components/objectives/CreateObjectiveDialog";
import { useObjectives } from "@/hooks/useObjectives";
import { useOkrTier } from "@/hooks/useOkrTier";
import { useAuth } from "@/contexts/AuthContext";
import { ownsActiveKr } from "@/lib/my-okrs";

type TabKey = "mine" | "company" | "board";

const STORAGE_KEY = "oxy:objectives-view";

function readStoredTab(): TabKey | "" {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "mine" || v === "company" || v === "board" ? v : "";
  } catch {
    return "";
  }
}

/**
 * /objectives — redesenhada em 3 visões (padrão Lattice/15Five): a pessoal
 * ("Meus OKRs") vem primeiro para quem tem KR, a hierarquia limpa da empresa
 * ("Empresa") para quem não tem, e o board completo ("Board (avançado)")
 * preservado intacto para o uso avançado. A escolha de aba persiste em
 * localStorage.
 */
export default function Objectives() {
  const { user } = useAuth();
  const { data: objectives = [], isLoading } = useObjectives();
  const { canCreateObjective } = useOkrTier();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tab, setTab] = useState<TabKey | "">(() => readStoredTab());

  // O usuário tem KR próprio (em objetivo ativo)? Define o default da aba —
  // mesma noção de "meu KR" de "Meu Dia" (owner do KR, herdando o do objetivo).
  const hasMyKrs = useMemo(() => ownsActiveKr(objectives, user?.id), [objectives, user?.id]);

  const activeTab: TabKey = tab || (hasMyKrs ? "mine" : "company");

  // Resolve o default uma vez que os dados carregaram (sem sobrescrever escolha).
  useEffect(() => {
    if (tab === "" && !isLoading) setTab(hasMyKrs ? "mine" : "company");
  }, [tab, isLoading, hasMyKrs]);

  const handleTabChange = useCallback((v: string) => {
    setTab(v as TabKey);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* localStorage indisponível — segue sem persistir */
    }
  }, []);

  // Sem escolha salva e ainda carregando: não sabemos o default (Meus OKRs vs
  // Empresa depende de `hasMyKrs`). Segura a renderização das abas para não
  // "piscar" a aba errada antes de os objetivos carregarem.
  if (tab === "" && isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Objetivos"
          description="Seus check-ins, os OKRs da empresa e o board completo — em um só lugar."
          icon={Target}
        />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <PageHeader
          title="Objetivos"
          description="Seus check-ins, os OKRs da empresa e o board completo — em um só lugar."
          icon={Target}
          actions={
            canCreateObjective && activeTab !== "board" ? (
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo objetivo
              </Button>
            ) : undefined
          }
        >
          <TabsList className="w-full justify-start sm:w-auto">
            <TabsTrigger value="mine" className="gap-1.5">
              <User className="h-4 w-4" />
              Meus OKRs
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-1.5">
              <Building2 className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="board" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              Board <span className="hidden sm:inline">(avançado)</span>
            </TabsTrigger>
          </TabsList>
        </PageHeader>

        <TabsContent value="mine" className="mt-0">
          <MyOkrsView onGoToCompany={() => handleTabChange("company")} />
        </TabsContent>

        <TabsContent value="company" className="mt-0">
          <CompanyOkrsList />
        </TabsContent>

        <TabsContent value="board" className="mt-0">
          <ObjectivesBoard />
        </TabsContent>
      </Tabs>

      {/* Criação de objetivo — mesmo gate (useOkrTier). O board mantém sua própria criação. */}
      <CreateObjectiveDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultType="strategic"
      />
    </AppLayout>
  );
}
