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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCreateDepartment, useUpdateDepartment, type Department } from "@/hooks/useDepartmentsManager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";

const departmentColors = [
  { name: "Azul", value: "#3B82F6" },
  { name: "Verde", value: "#10B981" },
  { name: "Roxo", value: "#8B5CF6" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Laranja", value: "#F97316" },
  { name: "Amarelo", value: "#EAB308" },
  { name: "Vermelho", value: "#EF4444" },
  { name: "Cinza", value: "#6B7280" },
];

interface CreateDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDepartment?: Department | null;
}

export function CreateDepartmentDialog({
  open,
  onOpenChange,
  editingDepartment,
}: CreateDepartmentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [leaderId, setLeaderId] = useState<string>("");

  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();

  const isEditing = !!editingDepartment;

  // Fetch company members for leader selection
  const { data: members = [] } = useQuery({
    queryKey: ["company-members-for-leader", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("company_memberships")
        .select(`
          user_id,
          user:users!company_memberships_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq("company_id", companyId)
        .eq("status", "active");

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!companyId,
  });

  useEffect(() => {
    if (editingDepartment) {
      setName(editingDepartment.name);
      setDescription(editingDepartment.description || "");
      setColor(editingDepartment.color);
      setLeaderId(editingDepartment.leader_id || "");
    } else {
      setName("");
      setDescription("");
      setColor("#3B82F6");
      setLeaderId("");
    }
  }, [editingDepartment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    try {
      if (isEditing && editingDepartment) {
        await updateDepartment.mutateAsync({
          id: editingDepartment.id,
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          leader_id: leaderId || null,
        });
      } else {
        await createDepartment.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          leader_id: leaderId || undefined,
        });
      }
      onOpenChange(false);
    } catch {
      // Error handled in hook
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isPending = createDepartment.isPending || updateDepartment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Área" : "Nova Área"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da área *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Tecnologia, Marketing, RH..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional da área..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor de identificação</Label>
            <div className="flex gap-2 flex-wrap">
              {departmentColors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    color === c.value
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Líder da área</Label>
            <Select value={leaderId || "none"} onValueChange={(val) => setLeaderId(val === "none" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um líder (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.user?.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.user?.full_name || null)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.user?.full_name || "Sem nome"}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {isPending ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
