import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Pencil, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TopicRow } from "@/hooks/useOneOnOneTopics";

interface Props {
  topic: TopicRow;
  currentUserId: string;
  onToggle: (id: string, done: boolean) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

export function TopicItem({ topic, currentUserId, onToggle, onEdit, onDelete, disabled }: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(topic.content);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: topic.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const isAuthor = topic.created_by === currentUserId;

  const commitEdit = () => {
    if (editValue.trim() && editValue.trim() !== topic.content) {
      onEdit(topic.id, editValue.trim());
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditValue(topic.content);
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 group hover:bg-muted/40 transition-colors",
        isDragging && "opacity-50 bg-muted",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
        tabIndex={-1}
        type="button"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Checkbox
        checked={topic.done}
        onCheckedChange={(v) => onToggle(topic.id, !!v)}
        disabled={disabled}
        className="shrink-0"
      />

      {editing ? (
        <div className="flex flex-1 items-center gap-1">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            className="h-7 text-sm"
            maxLength={1000}
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={commitEdit} type="button">
            <Check className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit} type="button">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <span
          className={cn(
            "flex-1 text-sm select-none",
            topic.done && "line-through text-muted-foreground",
          )}
        >
          {topic.content}
        </span>
      )}

      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {isAuthor && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setEditing(true)}
                disabled={disabled}
                type="button"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:text-destructive"
                onClick={() => onDelete(topic.id)}
                disabled={disabled}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
