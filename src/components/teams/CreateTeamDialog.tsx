import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Team, useCreateTeam, useUpdateTeam } from "@/hooks/useTeams";
import { Loader2 } from "lucide-react";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTeam?: Team | null;
}

export function CreateTeamDialog({ open, onOpenChange, editingTeam }: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();

  const isEditing = !!editingTeam;
  const isPending = createTeam.isPending || updateTeam.isPending;

  useEffect(() => {
    if (editingTeam) {
      setName(editingTeam.name);
      setDescription(editingTeam.description || "");
      setDepartment(editingTeam.department || "");
    } else {
      setName("");
      setDescription("");
      setDepartment("");
    }
  }, [editingTeam, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (isEditing) {
        await updateTeam.mutateAsync({
          id: editingTeam.id,
          name: name.trim(),
          description: description.trim() || null,
          department: department.trim() || null,
        });
      } else {
        await createTeam.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          department: department.trim() || undefined,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Time" : "Novo Time"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Time *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Time de Produto"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Área</Label>
            <Input
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Ex: Tecnologia"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo da equipe..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar" : "Criar Time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
