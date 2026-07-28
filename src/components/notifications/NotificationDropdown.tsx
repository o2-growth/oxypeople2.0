import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  Trophy,
  MessageSquare,
  Target,
  BarChart3,
  Megaphone,
  AtSign,
  Check,
  CheckCheck,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { cn } from "@/lib/utils";
import { useNotifications, Notification } from "@/hooks/useNotifications";

const typeIcons: Record<string, typeof Bell> = {
  recognition: Trophy,
  mention: AtSign,
  comment: MessageSquare,
  survey: BarChart3,
  announcement: Megaphone,
  objective_deadline: Target,
};

const typeColors: Record<string, string> = {
  recognition: "text-yellow-500 bg-yellow-500/10",
  mention: "text-blue-500 bg-blue-500/10",
  comment: "text-green-500 bg-green-500/10",
  survey: "text-purple-500 bg-purple-500/10",
  announcement: "text-orange-500 bg-orange-500/10",
  objective_deadline: "text-red-500 bg-red-500/10",
};

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (notification: Notification) => void;
}) {
  const Icon = typeIcons[notification.type] || Bell;
  const colorClass = typeColors[notification.type] || "text-muted-foreground bg-muted";
  const isUnread = !notification.read_at;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border last:border-b-0",
        isUnread && "bg-primary/5"
      )}
      onClick={() => onClick(notification)}
    >
      <div className={cn("p-2 rounded-full shrink-0", colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm", isUnread && "font-semibold")}>
            {notification.title}
          </p>
          {isUnread && (
            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </p>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        {isUnread && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function NotificationDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  // Onda 1: exemplo de useAutoAnimate num container de lista (adoção ampla nas Ondas 2/3).
  const [listRef] = useAutoAnimate<HTMLDivElement>();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }

    // Navigate based on reference type
    if (notification.reference_type && notification.reference_id) {
      switch (notification.reference_type) {
        case "post":
          navigate("/feed");
          break;
        case "recognition":
          navigate("/recognition");
          break;
        case "survey":
          navigate("/surveys");
          break;
        case "announcement":
          navigate("/feed");
          break;
        case "objective":
          navigate("/objectives");
          break;
        default:
          break;
      }
    }

    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-secondary h-10 w-10"
        >
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="h-3 w-3" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div ref={listRef}>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onClick={handleNotificationClick}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
