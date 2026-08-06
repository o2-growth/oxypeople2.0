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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Team, useCreateTeam, useUpdateTeam, useTeams } from "@/hooks/useTeams";
import { Loader2 } from "lucide-react";

const SEM_PAI = "__none__";
const NOVA_AREA = "__nova__";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTeam?: Team | null;
}

export function CreateTeamDialog({ open, onOpenChange, editingTeam }: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [novaArea, setNovaArea] = useState(false);
  const [parentId, setParentId] = useState(SEM_PAI);

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const { data: todosOsTimes = [] } = useTeams();

  /** Só time de topo pode ser pai: a estrutura tem três níveis. */
  const possiveisPais = todosOsTimes.filter(
    (t) => !t.parent_team_id && t.id !== editingTeam?.id,
  );

  const areasExistentes = [
    ...new Set(
      todosOsTimes
        .map((t) => t.department?.trim())
        .filter((d): d is string => !!d),
    ),
  ].sort();

  const isEditing = !!editingTeam;
  const isPending = createTeam.isPending || updateTeam.isPending;

  useEffect(() => {
    if (editingTeam) {
      setName(editingTeam.name);
      setDescription(editingTeam.description || "");
      setDepartment(editingTeam.department || "");
      setParentId(editingTeam.parent_team_id ?? SEM_PAI);
    } else {
      setName("");
      setDescription("");
      setDepartment("");
      setParentId(SEM_PAI);
    }
    setNovaArea(false);
  }, [editingTeam, open]);

  const ehSquad = parentId !== SEM_PAI;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      // A área de um squad é sempre a do time-pai: deixar as duas divergirem
      // faria o squad aparecer numa área e o time dele em outra.
      const areaDoPai = ehSquad
        ? todosOsTimes.find((t) => t.id === parentId)?.department ?? null
        : null;
      const area = ehSquad ? areaDoPai : department.trim() || null;

      if (isEditing) {
        await updateTeam.mutateAsync({
          id: editingTeam.id,
          name: name.trim(),
          description: description.trim() || null,
          department: area,
          parent_team_id: ehSquad ? parentId : null,
        });
      } else {
        await createTeam.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          department: area ?? undefined,
          parent_team_id: ehSquad ? parentId : null,
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
            {isEditing
              ? ehSquad ? "Editar squad" : "Editar time"
              : ehSquad ? "Novo squad" : "Novo time"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ehSquad ? "Ex: Squad Inbound" : "Ex: Time de Produto"}
              required
            />
          </div>

          {/* Sem este campo a tela mostrava uma hierarquia que ela mesma não
              conseguia criar: os squads existentes só vieram por script. */}
          <div className="space-y-2">
            <Label>Fica dentro de</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_PAI}>Nenhum — é um time</SelectItem>
                {possiveisPais.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.department ? ` · ${t.department}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {ehSquad
                ? "Vira um squad e herda a área do time escolhido."
                : "Deixe assim para um time de topo, que aparece direto na área."}
            </p>
          </div>

          {!ehSquad && (
            <div className="space-y-2">
              <Label htmlFor="department">Área</Label>
              {novaArea ? (
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Nome da nova área"
                  autoFocus
                />
              ) : (
                <Select
                  value={department || SEM_PAI}
                  onValueChange={(v) => {
                    if (v === NOVA_AREA) { setNovaArea(true); setDepartment(""); }
                    else setDepartment(v === SEM_PAI ? "" : v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_PAI}>Sem área</SelectItem>
                    {areasExistentes.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                    <SelectItem value={NOVA_AREA}>+ Nova área…</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {/* Digitar a área à mão criava uma área nova a cada variação de
                  grafia — "operação" minúsculo virava outra coluna, em cinza. */}
              {novaArea && (
                <button
                  type="button"
                  onClick={() => { setNovaArea(false); setDepartment(""); }}
                  className="text-xs text-muted-foreground underline"
                >
                  escolher uma área existente
                </button>
              )}
            </div>
          )}

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
