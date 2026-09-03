import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake, PartyPopper } from "lucide-react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import type { HREvent } from "@/hooks/useHRCalendar";

interface BirthdaysListProps {
  /** Aniversários e o2versários do mês, já vindos do useHRCalendar. */
  birthdays: HREvent[];
  isLoading: boolean;
}

export function BirthdaysList({ birthdays, isLoading }: BirthdaysListProps) {
  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-40" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cake className="h-4 w-4 text-pink-500" />
          <h3 className="text-sm font-semibold">Datas do Mês</h3>
        </div>
        {birthdays.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma data este mês 🎂</p>
        ) : (
          <div className="space-y-2.5">
            {birthdays.map((b) => {
              const ehO2versario = b.type === "work_anniversary";
              const hoje = isToday(b.date);
              return (
                <div key={b.id} className="flex items-center gap-2.5">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={b.avatarUrl || undefined} />
                    <AvatarFallback
                      className={
                        ehO2versario
                          ? "bg-violet-100 text-violet-600 text-xs"
                          : "bg-pink-100 text-pink-600 text-xs"
                      }
                    >
                      {getInitials(b.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate flex items-center gap-1.5">
                      {b.userName}
                      {ehO2versario && (
                        <PartyPopper className="h-3 w-3 shrink-0 text-violet-500" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {/* No dia, o que importa é o "hoje" — a data exata a pessoa
                          já leu no card do colega da semana passada. */}
                      {hoje ? "hoje" : format(b.date, "dd 'de' MMM", { locale: ptBR })}
                      {ehO2versario && b.years
                        ? ` · ${b.years} ${b.years === 1 ? "ano" : "anos"} de O2`
                        : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
