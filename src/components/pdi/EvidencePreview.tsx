import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";
import type { PDIAction } from "@/hooks/usePDIActions";
import { useDeleteEvidence, useGetSignedUrl } from "@/hooks/usePDIEvidence";

interface Props {
  action: PDIAction;
  planId: string;
  isOwner: boolean;
  onReplace: () => void;
}

function extractFilename(path: string): string {
  const segments = path.split("/");
  const last = segments[segments.length - 1] ?? path;
  // Remove the UUID prefix (36 chars + hyphen)
  const uuidPrefix = last.match(/^[0-9a-f-]{37}/i);
  if (uuidPrefix) {
    return last.slice(uuidPrefix[0].length);
  }
  return last;
}

export function EvidencePreview({ action, planId, isOwner, onReplace }: Props) {
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const deleteEvidence = useDeleteEvidence(planId);
  const getSignedUrl = useGetSignedUrl();

  const filename = action.evidence_url ? extractFilename(action.evidence_url) : "";

  const handleView = async () => {
    if (!action.evidence_url) return;
    setLoadingUrl(true);
    try {
      const url = await getSignedUrl(action.evidence_url, isOwner);
      window.open(url, "_blank");
    } catch (err) {
      // error is surfaced by toast inside getSignedUrl; we swallow here
    } finally {
      setLoadingUrl(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap mt-1">
        <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={filename}>
          {filename}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0"
          onClick={handleView}
          disabled={loadingUrl}
          type="button"
          title="Ver evidência"
        >
          {loadingUrl ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ExternalLink className="h-3 w-3" />
          )}
        </Button>
        {isOwner && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0"
              onClick={onReplace}
              type="button"
              title="Substituir evidência"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0 hover:text-destructive"
              onClick={() => setConfirmRemove(true)}
              type="button"
              title="Remover evidência"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover evidência?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo será removido permanentemente desta ação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteEvidence.mutate({ action });
                setConfirmRemove(false);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
