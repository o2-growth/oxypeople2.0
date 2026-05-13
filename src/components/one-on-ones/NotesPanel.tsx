import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Lock, Users, Info } from "lucide-react";
import { NoteItem } from "./NoteItem";
import { NoteForm } from "./NoteForm";
import { useOneOnOneNotes } from "@/hooks/useOneOnOneNotes";
import type { NoteVisibility } from "@/hooks/useOneOnOneNotes";

interface Props {
  oneOnOneId: string;
  currentUserId: string;
  isLeader: boolean;
}

export function NotesPanel({ oneOnOneId, currentUserId, isLeader }: Props) {
  const { list, addNote, editContent, deleteNote } = useOneOnOneNotes(oneOnOneId);

  const notes = list.data ?? [];
  const sharedNotes = notes.filter((n) => n.visibility === "shared");
  const privateVisibility: NoteVisibility = isLeader ? "private_leader" : "private_member";
  const myPrivateNotes = notes.filter((n) => n.visibility === privateVisibility);

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2 px-2 mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notas</h3>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground leading-none text-right">
          <Info className="h-3 w-3 shrink-0" />
          Notas privadas são visíveis apenas para quem as escreveu
        </span>
      </div>

      {list.isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="shared">
          <TabsList className="w-full">
            <TabsTrigger value="shared" className="flex-1 gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" /> Compartilhadas
            </TabsTrigger>
            <TabsTrigger value="private" className="flex-1 gap-1.5 text-xs">
              <Lock className="h-3.5 w-3.5" /> Minhas notas privadas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shared" className="mt-3 space-y-2">
            {sharedNotes.length === 0 && (
              <p className="text-sm text-muted-foreground py-3 px-2">
                Nenhuma nota compartilhada ainda.
              </p>
            )}
            {sharedNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                currentUserId={currentUserId}
                onEdit={(id, content) => editContent.mutate({ id, content })}
                onDelete={(id) => deleteNote.mutate(id)}
              />
            ))}
            <NoteForm
              visibility="shared"
              onSubmit={(content) => addNote.mutate({ content, visibility: "shared" })}
              isSubmitting={addNote.isPending}
              placeholder="Adicionar nota compartilhada..."
            />
          </TabsContent>

          <TabsContent value="private" className="mt-3 space-y-2">
            <p className="text-[11px] text-muted-foreground px-1 mb-2 flex items-center gap-1">
              <Lock className="h-3 w-3 shrink-0" /> Só você vê estas notas — a outra parte não tem acesso
            </p>
            {myPrivateNotes.length === 0 && (
              <p className="text-sm text-muted-foreground py-3 px-2">
                Nenhuma nota privada ainda.
              </p>
            )}
            {myPrivateNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                currentUserId={currentUserId}
                onEdit={(id, content) => editContent.mutate({ id, content })}
                onDelete={(id) => deleteNote.mutate(id)}
              />
            ))}
            <NoteForm
              visibility={privateVisibility}
              onSubmit={(content) => addNote.mutate({ content, visibility: privateVisibility })}
              isSubmitting={addNote.isPending}
              placeholder="Adicionar nota privada (só você vê)..."
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
