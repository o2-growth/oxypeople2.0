import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Cake, Clock, FileText, CalendarDays, PartyPopper } from "lucide-react";
import { useHRCalendar, type HREventType } from "@/hooks/useHRCalendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const eventConfig: Record<HREventType, { icon: typeof Cake; label: string; color: string }> = {
  birthday: { icon: Cake, label: "Aniversário", color: "bg-pink-500/10 text-pink-600 border-pink-200" },
  work_anniversary: { icon: PartyPopper, label: "O2versário", color: "bg-violet-500/10 text-violet-600 border-violet-200" },
  experience_end: { icon: Clock, label: "Fim Experiência", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  contract_expiry: { icon: FileText, label: "Venc. Contrato", color: "bg-red-500/10 text-red-600 border-red-200" },
};

export function HRCalendarTab() {
  const [period, setPeriod] = useState<"all" | "week" | "month">("month");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: events = [], isLoading } = useHRCalendar(period);

  const filteredEvents = typeFilter === "all"
    ? events
    : events.filter((e) => e.type === typeFilter);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Calendário de Eventos RH
          </CardTitle>
          <div className="flex gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="birthday">Aniversários</SelectItem>
                <SelectItem value="work_anniversary">O2versários</SelectItem>
                <SelectItem value="experience_end">Fim Experiência</SelectItem>
                <SelectItem value="contract_expiry">Venc. Contrato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nenhum evento encontrado</h3>
            <p className="text-muted-foreground">Não há eventos de RH para o período selecionado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const config = eventConfig[event.type];
              const Icon = config.icon;
              const initials = event.userName.split(" ").map((n) => n[0]).join("").slice(0, 2);

              return (
                <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={event.avatarUrl || undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{event.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {format(event.date, "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                      {event.department && (
                        <span className="text-xs text-muted-foreground">• {event.department}</span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={`gap-1 ${config.color}`}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
