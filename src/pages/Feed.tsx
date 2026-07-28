import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCompanyEvents, type CompanyEvent } from "@/hooks/useCompanyEvents";
import { useHRCalendar } from "@/hooks/useHRCalendar";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { UpcomingEventsCarousel } from "@/components/mural/UpcomingEventsCarousel";
import { PinnedAnnouncements } from "@/components/mural/PinnedAnnouncements";
import { MiniCalendar } from "@/components/mural/MiniCalendar";
import { BirthdaysList } from "@/components/mural/BirthdaysList";
import { MonthHighlights } from "@/components/mural/MonthHighlights";
import { CreateEventDialog } from "@/components/mural/CreateEventDialog";
import { EventDetailDialog } from "@/components/mural/EventDetailDialog";

const Feed = () => {
  const { data: events, isLoading: loadingEvents } = useCompanyEvents();
  const { data: hrEvents, isLoading: loadingHR } = useHRCalendar("month");
  const { isAdmin } = useUserPermissions();

  const [selectedEvent, setSelectedEvent] = useState<CompanyEvent | null>(null);

  const birthdays = useMemo(
    () => (hrEvents || []).filter((e) => e.type === "birthday"),
    [hrEvents]
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Mural da Empresa"
          description="Eventos, comunicados e tudo que está acontecendo"
          actions={isAdmin ? <CreateEventDialog /> : undefined}
        />

        <section>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Próximos Eventos
          </h2>
          <UpcomingEventsCarousel
            events={events}
            isLoading={loadingEvents}
            onEventClick={(e) => setSelectedEvent(e)}
          />
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PinnedAnnouncements />
          <MiniCalendar events={events || []} hrEvents={hrEvents || []} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BirthdaysList birthdays={birthdays} isLoading={loadingHR} />
          <MonthHighlights />
        </div>
      </div>

      <EventDetailDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      />
    </AppLayout>
  );
};

export default Feed;
