import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock, Users, Pencil, Trash2, Check, X } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { NoteRow } from "@/hooks/useOneOnOneNotes";

interface Props {
  note: NoteRow;
  currentUserId: string;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

export function NoteItem({ note, currentUserId, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(note.content);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const isAuthor = note.author_id === currentUserId;
  const isPrivate = note.visibility !== "shared";

  const commitEdit = () => {
    if (editValue.trim() && editValue.trim() !== note.content) {
      onEdit(note.id, editValue.trim());
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditValue(note.content);
    setEditing(false);
  };

  const authorName = note.author?.full_name ?? "Usuário";
  const initials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const relativeTime = formatDistanceToNow(parseISO(note.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <>
      <div
        className={cn(
          "rounded-lg border p-3 space-y-2 text-sm",
          isPrivate
            ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
            : "border-border bg-card",
        )}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={note.author?.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-xs">{authorName}</span>
            <span className="text-xs text-muted-foreground">{relativeTime}</span>
          </div>
          {isPrivate ? (
            <Badge
              variant="outline"
              className="text-[10px] py-0 gap-1 border-amber-400 text-amber-700 dark:text-amber-400"
              title="Só você vê esta nota"
            >
              <Lock className="h-2.5 w-2.5" /> Privada
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] py-0 gap-1">
              <Users className="h-2.5 w-2.5" /> Compartilhada
            </Badge>
          )}
        </div>

        {editing ? (
          <div className="space-y-1.5">
            <Textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancelEdit();
              }}
              className="text-sm min-h-[80px] resize-none"
              maxLength={10000}
            />
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={cancelEdit} type="button">
                <X className="h-3.5 w-3.5" /> Cancelar
              </Button>
              <Button size="sm" className="h-7 px-2 gap-1" onClick={commitEdit} type="button">
                <Check className="h-3.5 w-3.5" /> Salvar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
        )}

        {!editing && isAuthor && (
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 gap-1 text-muted-foreground"
              onClick={() => setEditing(true)}
              type="button"
            >
              <Pencil className="h-3 w-3" /> Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 gap-1 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              type="button"
            >
              <Trash2 className="h-3 w-3" /> Excluir
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta nota?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(note.id);
                setDeleteOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
