import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { OkrSettingsPanel } from "@/components/objectives/OkrSettingsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  User,
  Bell,
  Shield,
  Palette,
  Link2,
  Moon,
  Sun,
  Monitor,
  LogOut,
  Trash2,
  Target,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/hooks/useUser";
import { useMyMembership } from "@/hooks/usePeopleList";
import { cn } from "@/lib/utils";

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = name?.trim() || email?.split("@")[0] || "U";
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { profile, isLoading } = useUser();
  const { data: membership } = useMyMembership();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";
  const displayEmail = profile?.email || user?.email || "";
  const metadata = (profile?.metadata as Record<string, unknown> | null) ?? {};
  const phone = typeof metadata.phone === "string" ? metadata.phone : "";
  const bio = typeof metadata.bio === "string" ? metadata.bio : "";
  const position = membership?.position ?? (typeof metadata.position === "string" ? metadata.position : "");
  const department = membership?.department_info?.name ?? (typeof metadata.department === "string" ? metadata.department : "");
  const cpf = typeof metadata.cpf === "string" ? metadata.cpf : "";
  const personalEmail = typeof metadata.personal_email === "string" ? metadata.personal_email : "";
  const birthDate = typeof metadata.birth_date === "string" ? metadata.birth_date : "";
  const address = typeof metadata.address === "string" ? metadata.address : "";
  const cnpj = typeof metadata.cnpj === "string" ? metadata.cnpj : "";
  const razaoSocial = typeof metadata.razao_social === "string" ? metadata.razao_social : "";
  const calendarLink = typeof metadata.calendar_link === "string" ? metadata.calendar_link : "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const themeOptions: Array<{ value: "light" | "dark" | "system"; label: string; Icon: typeof Sun }> = [
    { value: "light", label: "Claro", Icon: Sun },
    { value: "dark", label: "Escuro", Icon: Moon },
    { value: "system", label: "Sistema", Icon: Monitor },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas preferências e configurações de conta
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="flex-wrap h-auto gap-2">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Shield className="h-4 w-4" />
              Privacidade
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Link2 className="h-4 w-4" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="okr" className="gap-2">
              <Target className="h-4 w-4" />
              OKR
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            {isLoading ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Carregando perfil...
                </CardContent>
              </Card>
            ) : (
              <ProfileForm
                membershipId={membership?.id ?? null}
                user={{
                  name: displayName,
                  email: displayEmail,
                  avatar: profile?.avatar_url ?? "",
                  initials: getInitials(displayName, displayEmail),
                  bio,
                  phone,
                  department,
                  position,
                  cpf,
                  personalEmail,
                  birthDate,
                  address,
                  cnpj,
                  razaoSocial,
                  calendarLink,
                }}
              />
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            <NotificationSettings />
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Visibilidade do Perfil</CardTitle>
                <CardDescription>
                  Controle quem pode ver suas informações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mostrar email no perfil</Label>
                    <p className="text-sm text-muted-foreground">
                      Outros membros podem ver seu email
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mostrar telefone no perfil</Label>
                    <p className="text-sm text-muted-foreground">
                      Outros membros podem ver seu telefone
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mostrar no ranking</Label>
                    <p className="text-sm text-muted-foreground">
                      Aparecer no leaderboard de reconhecimentos
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Atividade</CardTitle>
                <CardDescription>
                  Controle a visibilidade da sua atividade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mostrar status online</Label>
                    <p className="text-sm text-muted-foreground">
                      Outros podem ver quando você está online
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mostrar última atividade</Label>
                    <p className="text-sm text-muted-foreground">
                      Exibir quando você esteve ativo pela última vez
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Tema</CardTitle>
                <CardDescription>
                  Personalize a aparência do aplicativo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  {themeOptions.map(({ value, label, Icon }) => {
                    const isActive = theme === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTheme(value)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50",
                        )}
                      >
                        <div
                          className={cn(
                            "h-12 w-12 rounded-lg flex items-center justify-center",
                            value === "light" && "bg-background border",
                            value === "dark" && "bg-slate-800 text-white",
                            value === "system" && "bg-gradient-to-br from-background to-slate-800",
                          )}
                        >
                          <Icon className={cn("h-6 w-6", value === "dark" && "text-white")} />
                        </div>
                        <span className="font-medium text-foreground">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Integrações Conectadas</CardTitle>
                <CardDescription>
                  Gerencie suas conexões com outros serviços
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-[#4A154B] flex items-center justify-center text-white font-bold">
                      S
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Slack</p>
                      <p className="text-sm text-muted-foreground">Não conectado</p>
                    </div>
                  </div>
                  <Button variant="outline">Conectar</Button>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-[#0078D4] flex items-center justify-center text-white font-bold">
                      T
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Microsoft Teams</p>
                      <p className="text-sm text-muted-foreground">Não conectado</p>
                    </div>
                  </div>
                  <Button variant="outline">Conectar</Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-[#4285F4] flex items-center justify-center text-white font-bold">
                      G
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Google Calendar</p>
                      <p className="text-sm text-green-500">Conectado</p>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm">Desconectar</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OKR Settings Tab */}
          <TabsContent value="okr" className="mt-6">
            <OkrSettingsPanel />
          </TabsContent>
        </Tabs>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
            <CardDescription>
              Ações irreversíveis para sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Sair da conta</p>
                <p className="text-sm text-muted-foreground">
                  Desconectar de todos os dispositivos
                </p>
              </div>
              <Button variant="outline" className="gap-2">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <p className="font-medium text-destructive">Excluir conta</p>
                <p className="text-sm text-muted-foreground">
                  Remover permanentemente sua conta e dados
                </p>
              </div>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
