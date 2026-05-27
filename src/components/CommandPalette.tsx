import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  MessageSquare,
  Trophy,
  Target,
  MessageSquareQuote,
  Inbox,
  Send,
  Sparkles,
  ClipboardCheck,
  Gamepad2,
  Building2,
  Briefcase,
  BarChart3,
  UsersRound,
  Settings,
  Zap,
  User as UserIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Nav = {
  label: string;
  to: string;
  Icon: typeof LayoutDashboard;
  group: string;
  shortcut?: string;
};

const NAV: Nav[] = [
  { label: "Dashboard", to: "/", Icon: LayoutDashboard, group: "Principal" },
  { label: "Mural", to: "/feed", Icon: MessageSquare, group: "Principal" },
  { label: "Automação", to: "/automation", Icon: Zap, group: "Principal" },
  { label: "Reconhecimentos", to: "/recognition", Icon: Trophy, group: "Engajamento" },
  { label: "Objetivos", to: "/objectives", Icon: Target, group: "Engajamento" },
  { label: "Pedir feedback", to: "/feedback/new", Icon: MessageSquareQuote, group: "Engajamento" },
  { label: "Inbox feedback", to: "/feedback/inbox", Icon: Inbox, group: "Engajamento" },
  { label: "Pedidos enviados", to: "/feedback/sent", Icon: Send, group: "Engajamento" },
  { label: "Sobre mim", to: "/feedback/about-me", Icon: Sparkles, group: "Engajamento" },
  { label: "Desempenho", to: "/performance", Icon: ClipboardCheck, group: "Engajamento" },
  { label: "Gamificação", to: "/gamification", Icon: Gamepad2, group: "Engajamento" },
  { label: "Empresa", to: "/company", Icon: Building2, group: "Gestão" },
  { label: "RH", to: "/hr", Icon: Briefcase, group: "Gestão" },
  { label: "Pesquisas", to: "/surveys", Icon: BarChart3, group: "Gestão" },
  { label: "Times", to: "/teams", Icon: UsersRound, group: "Gestão" },
  { label: "Configurações", to: "/settings", Icon: Settings, group: "Gestão" },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: people } = useQuery({
    queryKey: ["command-palette-people", search],
    enabled: open && search.trim().length >= 2,
    queryFn: async () => {
      const term = `%${search.trim()}%`;
      const { data } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url")
        .or(`full_name.ilike.${term},email.ilike.${term}`)
        .limit(8);
      return data ?? [];
    },
  });

  const { data: objectives } = useQuery({
    queryKey: ["command-palette-objectives", search],
    enabled: open && search.trim().length >= 2,
    queryFn: async () => {
      const term = `%${search.trim()}%`;
      const { data } = await supabase
        .from("objectives")
        .select("id, title")
        .ilike("title", term)
        .limit(8);
      return data ?? [];
    },
  });

  const handleSelect = (action: () => void) => {
    action();
    onOpenChange(false);
    setSearch("");
  };

  const groupedNav = NAV.reduce<Record<string, Nav[]>>((acc, item) => {
    (acc[item.group] ||= []).push(item);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar pessoas, objetivos ou navegar..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        {people && people.length > 0 && (
          <CommandGroup heading="Pessoas">
            {people.map((p) => (
              <CommandItem
                key={p.id}
                value={`pessoa-${p.full_name ?? p.email}`}
                onSelect={() => handleSelect(() => navigate(`/people/${p.id}`))}
              >
                <UserIcon className="mr-2 h-4 w-4" />
                <span className="flex-1">{p.full_name || p.email}</span>
                {p.full_name && (
                  <span className="text-xs text-muted-foreground ml-2">{p.email}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {objectives && objectives.length > 0 && (
          <CommandGroup heading="Objetivos">
            {objectives.map((o) => (
              <CommandItem
                key={o.id}
                value={`objetivo-${o.title}`}
                onSelect={() => handleSelect(() => navigate(`/objectives?id=${o.id}`))}
              >
                <Target className="mr-2 h-4 w-4" />
                <span className="flex-1">{o.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {((people && people.length > 0) || (objectives && objectives.length > 0)) && (
          <CommandSeparator />
        )}

        {Object.entries(groupedNav).map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map(({ label, to, Icon, shortcut }) => (
              <CommandItem
                key={to}
                value={`nav-${label}`}
                onSelect={() => handleSelect(() => navigate(to))}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{label}</span>
                {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen };
}
