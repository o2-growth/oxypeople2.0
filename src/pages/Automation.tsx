import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Megaphone, Zap, History, Settings, Slack } from "lucide-react";
import { AnnouncementsList } from "@/components/automation/AnnouncementsList";
import { AutomationCard } from "@/components/automation/AutomationCard";
import { AutomationLogs } from "@/components/automation/AutomationLogs";
import { CreateAnnouncement } from "@/components/automation/CreateAnnouncement";

export default function Automation() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Automação"
          description="Gerencie avisos e automações da sua empresa"
          icon={Zap}
          actions={
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Aviso
            </Button>
          }
        />

        <Tabs defaultValue="announcements" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="announcements" className="gap-2">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Avisos</span>
            </TabsTrigger>
            <TabsTrigger value="automations" className="gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Automações</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configurações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="announcements" className="space-y-4">
            <AnnouncementsList />
          </TabsContent>

          <TabsContent value="automations" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <AutomationCard
                type="birthday"
                title="Aniversários"
                description="Parabenize automaticamente colaboradores em seus aniversários"
                icon="🎂"
              />
              <AutomationCard
                type="anniversary"
                title="Tempo de Empresa"
                description="Celebre marcos de tempo de empresa dos colaboradores"
                icon="🎉"
              />
              <AutomationCard
                type="new_hire"
                title="Novos Colaboradores"
                description="Anuncie automaticamente novos membros da equipe"
                icon="👋"
              />
              <AutomationCard
                type="reminder"
                title="Lembretes"
                description="Configure lembretes automáticos para datas importantes"
                icon="📅"
              />
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <AutomationLogs />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  Configurações de Integração
                </h3>
                <Badge variant="secondary">Em breve</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Em breve você poderá conectar o Slack para enviar notificações
                automáticas para os canais da sua empresa.
              </p>
              <Button variant="outline" className="mt-4 gap-2" disabled>
                <Slack className="h-4 w-4" />
                Conectar Slack
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <CreateAnnouncement open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>
    </AppLayout>
  );
}
