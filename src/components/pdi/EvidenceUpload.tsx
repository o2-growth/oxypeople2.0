import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Paperclip } from "lucide-react";
import type { PDIAction } from "@/hooks/usePDIActions";
import { useUploadEvidence } from "@/hooks/usePDIEvidence";
import { EvidencePreview } from "./EvidencePreview";

interface Props {
  action: PDIAction;
  planId: string;
  isOwner: boolean;
}

export function EvidenceUpload({ action, planId, isOwner }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadEvidence = useUploadEvidence(planId);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadEvidence.mutate({ file, action });
    // Reset input so the same file can be re-selected after removal
    e.target.value = "";
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.mp4,.docx,.pptx"
        className="hidden"
        onChange={handleFileChange}
      />

      {uploadEvidence.isPending ? (
        <div className="flex items-center gap-1 mt-1">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Enviando...</span>
        </div>
      ) : action.evidence_url ? (
        <EvidencePreview
          action={action}
          planId={planId}
          isOwner={isOwner}
          onReplace={triggerFileInput}
        />
      ) : (
        isOwner && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-xs gap-1 text-muted-foreground hover:text-foreground mt-1"
            onClick={triggerFileInput}
            type="button"
          >
            <Paperclip className="h-3 w-3" />
            Anexar evidência
          </Button>
        )
      )}
    </div>
  );
}
