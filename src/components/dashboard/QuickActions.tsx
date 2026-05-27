import { useNavigate } from "react-router-dom";
import { MessageSquarePlus, Trophy, Target, Users } from "lucide-react";

const actions = [
  {
    label: "Criar Post",
    icon: MessageSquarePlus,
    path: "/feed",
    gradient: "from-primary to-primary/80",
  },
  {
    label: "Reconhecer",
    icon: Trophy,
    path: "/recognition",
    gradient: "from-warning to-warning/80",
  },
  {
    label: "Novo Objetivo",
    icon: Target,
    path: "/objectives",
    gradient: "from-success to-success/80",
  },
  {
    label: "Ver Time",
    icon: Users,
    path: "/hr",
    gradient: "from-destructive/80 to-destructive/60",
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => navigate(action.path)}
          className="group flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}
          >
            <action.icon className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
}
