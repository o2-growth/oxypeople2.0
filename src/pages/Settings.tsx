import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { OkrSettingsPanel } from "@/components/objectives/OkrSettingsPanel";
import { QueryError } from "@/components/QueryError";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Bell,
  Palette,
  Moon,
  Sun,
  Monitor,
  LogOut,
  Target,
  Settings as SettingsIcon,
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

function ProfileFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { profile, isLoading, error: profileError, refetch } = useUser();
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
        <PageHeader
          title="Configurações"
          description="Gerencie suas preferências e configurações de conta"
          icon={SettingsIcon}
        />

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
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="okr" className="gap-2">
              <Target className="h-4 w-4" />
              OKR
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            {isLoading ? (
              <ProfileFormSkeleton />
            ) : profileError ? (
              <QueryError
                message="Não foi possível carregar seu perfil."
                onRetry={() => refetch()}
              />
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
                        aria-pressed={isActive}
                        className={cn(
                          "flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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

          {/* OKR Settings Tab */}
          <TabsContent value="okr" className="mt-6">
            <OkrSettingsPanel />
          </TabsContent>
        </Tabs>

        {/* Sessão */}
        <Card>
          <CardHeader>
            <CardTitle>Sessão</CardTitle>
            <CardDescription>
              Gerencie o acesso à sua conta neste navegador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-foreground">Sair da conta</p>
                <p className="text-sm text-muted-foreground">
                  Encerra sua sessão atual e retorna à tela de login
                </p>
              </div>
              <Button variant="outline" className="gap-2" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
