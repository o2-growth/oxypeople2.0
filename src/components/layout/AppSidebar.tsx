import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Building2,
  Trophy,
  Target,
  Settings,
  ChevronDown,
  Zap,
  UsersRound,
  ClipboardCheck,
  Gamepad2,
  Briefcase,
  MessageSquareQuote,
  Inbox,
  Send,
  Sparkles,
  Coffee,
  LogOut,
  User,
  Moon,
  Sun,
  MonitorPlay,
  ExternalLink,
  BookOpen,
  BarChart3,
  Palmtree,
  Activity,
} from "lucide-react";
import { useTheme } from "next-themes";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { useAuth } from "@/contexts/AuthContext";
import { useIsManager } from "@/hooks/useIsManager";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { O2Logo } from "@/components/o2/Logo";
import { APP_VERSION } from "@/lib/version";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
}

const inicioItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Mural", url: "/feed", icon: MessageSquare },
];

const meuEspacoItems: NavItem[] = [
  { title: "Sobre mim", url: "/feedback/about-me", icon: Sparkles },
  { title: "Objetivos", url: "/objectives", icon: Target },
  { title: "Desempenho", url: "/performance", icon: ClipboardCheck },
  { title: "Gamificação", url: "/gamification", icon: Gamepad2 },
  { title: "Reconhecimentos", url: "/recognition", icon: Trophy },
];

const feedbackItems: NavItem[] = [
  { title: "Inbox", url: "/feedback/inbox", icon: Inbox },
  { title: "Pedir feedback", url: "/feedback/new", icon: MessageSquareQuote },
  { title: "Enviados", url: "/feedback/sent", icon: Send },
];

const desenvolvimentoItems: NavItem[] = [
  { title: "PDI", url: "/pdi", icon: BookOpen },
  { title: "1:1s", url: "/one-on-ones", icon: Coffee },
];

const gestaoItems: NavItem[] = [
  { title: "RH", url: "/hr", icon: Briefcase },
  { title: "Times", url: "/teams", icon: UsersRound },
  { title: "Pesquisas", url: "/surveys", icon: BarChart3 },
  { title: "PDI do Time", url: "/pdi/team", icon: Users },
  { title: "1:1s Gestão", url: "/admin/one-on-ones-dashboard", icon: Coffee },
];

const adminItems: NavItem[] = [
  { title: "Empresa", url: "/company", icon: Building2 },
  { title: "Pesquisas Pulse", url: "/admin/pulse-surveys", icon: Activity },
  { title: "Férias", url: "/time-off", icon: Palmtree },
  { title: "Automação", url: "/automation", icon: Zap },
  { title: "Oxy VE", url: "https://oxyve.lovable.app", icon: MonitorPlay, external: true },
];

interface NavGroupProps {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

function NavGroup({ label, items, defaultOpen = true }: NavGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const hasActiveItem = items.some((item) => location.pathname === item.url);

  return (
    <Collapsible open={isOpen || hasActiveItem} onOpenChange={setIsOpen}>
      <SidebarGroup>
        {!collapsed && (
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="flex cursor-pointer items-center justify-between text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
              <span>{label}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </SidebarGroupLabel>
          </CollapsibleTrigger>
        )}
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined}>
                    {item.external ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/80 transition-all duration-200",
                          "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="font-medium text-base">{item.title}</span>
                        <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-60" />
                      </a>
                    ) : (
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/80 transition-all duration-200",
                          "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                        activeClassName="bg-sidebar-primary text-sidebar-primary-foreground shadow-md border-l-2 border-sidebar-primary-foreground/40"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="font-medium text-base">{item.title}</span>
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { profile } = useUser();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isManager } = useIsManager();
  const { isAdmin, role } = useUserPermissions();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Usuário";
  const displayEmail = user?.email || "usuario@empresa.com";
  const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || "user"}`;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <Sidebar className="border-r border-sidebar-border" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <div className="flex items-center justify-center gap-3">
          <div className={cn(
            "flex items-center justify-center rounded-xl bg-primary shadow-[0_0_15px_hsla(138,100%,42%,0.5)] transition-all animate-pulse-soft p-1.5",
            collapsed ? "h-9 w-9" : "h-10 w-10"
          )}>
            <O2Logo variant="icon" forceTheme="dark" className={cn(collapsed ? "h-5 w-5" : "h-6 w-6")} alt="O2" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-heading font-bold text-sidebar-foreground">Oxy People</span>
              <span className="text-xs text-sidebar-foreground/60">by O2 Inc</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <NavGroup label="Início" items={inicioItems} />
        <NavGroup label="Meu Espaço" items={meuEspacoItems} />
        <NavGroup label="Feedback" items={feedbackItems} defaultOpen={false} />
        <NavGroup label="Desenvolvimento" items={desenvolvimentoItems} defaultOpen={false} />
        {(isManager || isAdmin) && (
          <NavGroup label="Gestão" items={gestaoItems} defaultOpen={false} />
        )}
        {isAdmin && (
          <NavGroup label="Administração" items={adminItems} defaultOpen={false} />
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && (
          <div className="mb-3 px-1">
            {role === "owner" ? (
              <a
                href="https://github.com/o2-growth/oxypeople2.0"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
              >
                <span>v{APP_VERSION}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-[11px] text-sidebar-foreground/40">v{APP_VERSION}</span>
            )}
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-1 transition-colors hover:bg-sidebar-accent focus:outline-none focus:ring-2 focus:ring-sidebar-primary/20">
              <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/20">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground">{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col overflow-hidden text-left">
                  <span className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">{displayEmail}</span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <User className="mr-2 h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
