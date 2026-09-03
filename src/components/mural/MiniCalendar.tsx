import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CompanyEvent } from "@/hooks/useCompanyEvents";
import type { HREvent } from "@/hooks/useHRCalendar";

interface MiniCalendarProps {
  events: CompanyEvent[];
  hrEvents: HREvent[];
}

export function MiniCalendar({ events, hrEvents }: MiniCalendarProps) {
  const [selected, setSelected] = useState<Date | undefined>(undefined);

  const eventDates = useMemo(() => {
    const dates = new Set<string>();
    events.forEach((e) => dates.add(format(new Date(e.event_date), "yyyy-MM-dd")));
    hrEvents.forEach((e) => dates.add(format(e.date, "yyyy-MM-dd")));
    return dates;
  }, [events, hrEvents]);

  const selectedDayEvents = useMemo(() => {
    if (!selected) return [];
    const items: { title: string; color: string; type: string }[] = [];
    events.forEach((e) => {
      if (isSameDay(new Date(e.event_date), selected)) {
        items.push({ title: e.title, color: e.color, type: e.event_type });
      }
    });
    hrEvents.forEach((e) => {
      if (isSameDay(e.date, selected)) {
        const cor =
          e.type === "birthday" ? "#ec4899"
          : e.type === "work_anniversary" ? "#8b5cf6"
          : "#f59e0b";
        items.push({ title: e.description, color: cor, type: e.type });
      }
    });
    return items;
  }, [selected, events, hrEvents]);

  return (
    <Card>
      <CardContent className="p-3">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          locale={ptBR}
          className={cn("p-0 pointer-events-auto")}
          modifiers={{ hasEvent: (day) => eventDates.has(format(day, "yyyy-MM-dd")) }}
          modifiersStyles={{ hasEvent: { fontWeight: 700, textDecoration: "underline", textDecorationColor: "hsl(152 60% 42%)", textUnderlineOffset: "4px" } }}
        />
        {selected && selectedDayEvents.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              {format(selected, "dd 'de' MMMM", { locale: ptBR })}
            </p>
            {selectedDayEvents.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs truncate">{item.title}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
