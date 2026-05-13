import { useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { TopicItem } from "./TopicItem";
import { useOneOnOneTopics } from "@/hooks/useOneOnOneTopics";

interface Props {
  oneOnOneId: string;
  currentUserId: string;
}

export function TopicsPanel({ oneOnOneId, currentUserId }: Props) {
  const { list, addTopic, toggleDone, editContent, deleteTopic, reorder } =
    useOneOnOneTopics(oneOnOneId);
  const [newContent, setNewContent] = useState("");

  const sensors = useSensors(useSensor(PointerSensor));

  const topics = list.data ?? [];
  const isMutating = reorder.isPending;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newContent.trim()) {
      addTopic.mutate(newContent.trim());
      setNewContent("");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = topics.findIndex((t) => t.id === active.id);
    const newIndex = topics.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorder.mutate(arrayMove(topics, oldIndex, newIndex));
  };

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-2">
        Pauta
      </h3>

      {list.isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={topics.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {topics.length === 0 && (
              <p className="text-sm text-muted-foreground py-3 px-2">
                Nenhum tópico ainda. Adicione abaixo.
              </p>
            )}
            {topics.map((topic) => (
              <TopicItem
                key={topic.id}
                topic={topic}
                currentUserId={currentUserId}
                onToggle={(id, done) => toggleDone.mutate({ id, done })}
                onEdit={(id, content) => editContent.mutate({ id, content })}
                onDelete={(id) => deleteTopic.mutate(id)}
                disabled={isMutating}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <div className="pt-2 px-1">
        <Input
          placeholder="Adicionar tópico..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={1000}
          disabled={addTopic.isPending}
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}
