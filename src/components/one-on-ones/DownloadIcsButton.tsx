import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { buildIcs, icsFilename } from "@/lib/ics";
import type { IcsMeeting, IcsPerson } from "@/lib/ics";

interface Props {
  meeting: IcsMeeting;
  leader: IcsPerson;
  member: IcsPerson;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
}

export function DownloadIcsButton({
  meeting,
  leader,
  member,
  variant = "outline",
  size = "sm",
  className,
}: Props) {
  const handleDownload = () => {
    const detailUrl = `${window.location.origin}/one-on-ones/${meeting.id}`;
    const content = buildIcs(meeting, leader, member, detailUrl);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = icsFilename(leader, member, meeting.scheduled_at);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    trackEvent("one_on_one_ics_downloaded");
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      className={className}
      type="button"
      title="Baixar convite de calendário (.ics)"
    >
      <Download className="h-3.5 w-3.5" />
      {size !== "icon" && <span className="ml-1.5">Baixar .ics</span>}
    </Button>
  );
}

export type { IcsMeeting, IcsPerson };
