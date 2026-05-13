import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import type { PDIAction } from "@/hooks/usePDIActions";

export function FeedbackOriginBadge({ action }: { action: PDIAction }) {
  const navigate = useNavigate();
  if (!action.feedback_request_id) return null;
  return (
    <Badge
      variant="outline"
      className="text-xs px-1.5 py-0 gap-1 cursor-pointer hover:bg-accent"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/feedback/${action.feedback_request_id}`);
      }}
    >
      <MessageSquare className="h-2.5 w-2.5" />
      De feedback
    </Badge>
  );
}
