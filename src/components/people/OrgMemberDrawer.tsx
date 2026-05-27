import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Mail, Briefcase, Building2, Users, ShieldCheck, ShieldOff, Loader2, Network, Save } from "lucide-react";
import type { HierarchyNode } from "@/hooks/useOrganizationHierarchy";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import {
  useOkrAccessLevels,
  useUpdateOkrAccessLevel,
  type OkrAccessLevel,
} from "@/hooks/useOkrAccessLevels";
import { useManagers } from "@/hooks/useManagers";
import { useDepartmentOptions } from "@/hooks/usePeopleWithBirthdays";
import { useUpdateMember } from "@/hooks/usePeopleList";
import { usePeopleList } from "@/hooks/usePeopleList";
import { toast } from "sonner";

interface OrgMemberDrawerProps {
  node: HierarchyNode | null;
  onOpenChange: (open: boolean) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const TYPE_LABEL: Record<HierarchyNode["type"], string> = {
  company: "Sócio · CEO",
  department: "Área",
  team: "Time",
  member: "Colaborador",
};

const NO_MANAGER = "__none__";
const NO_DEPT = "__none__";

function OrgEditSection({ node, onClose }: { node: HierarchyNode; onClose: () => void }) {
  const { members, setManager, isMutating: managersLoading } = useManagers();
  const { data: departments = [] } = useDepartmentOptions();
  const { data: people = [] } = usePeopleList();
  const updateMember = useUpdateMember();

  const userId = node.id.startsWith("member-") ? node.id.slice("member-".length) : null;
  const membership = userId ? people.find((p) => p.user_id === userId) : null;

  const currentManager = userId
    ? members.find((m) => m.user_id === userId)?.manager_id ?? NO_MANAGER
    : NO_MANAGER;
  const currentDeptId = membership?.department_id ?? NO_DEPT;

  const [managerId, setManagerId] = useState<string>(currentManager ?? NO_MANAGER);
  const [deptId, setDeptId] = useState<string>(currentDeptId ?? NO_DEPT);

  if (!userId || !membership) return null;

  const otherMembers = members.filter((m) => m.user_id !== userId);

  const handleSave = async () => {
    try {
      const newManagerId = managerId === NO_MANAGER ? null : managerId;
      if (newManagerId !== (currentManager === NO_MANAGER ? null : currentManager)) {
        await setManager(userId, newManagerId);
      }

      const newDeptId = deptId === NO_DEPT ? null : deptId;
      if (newDeptId !== (currentDeptId === NO_DEPT ? null : currentDeptId)) {
        await updateMember.mutateAsync({
          membershipId: membership.id,
          userId,
          department_id: newDeptId,
        });
      }

      toast.success("Organograma atualizado!");
      onClose();
    } catch {
      // Errors already shown by hooks
    }
  };

  const isSaving = managersLoading || updateMember.isPending;

  return (
    <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2 text-foreground">
        <Network className="h-4 w-4 shrink-0" />
        <span className="font-medium">Editar Organograma</span>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Gestor</label>
        <Select value={managerId} onValueChange={setManagerId} disabled={isSaving}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Sem gestor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_MANAGER}>Sem gestor</SelectItem>
            {otherMembers.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.full_name || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Área</label>
        <Select value={deptId} onValueChange={setDeptId} disabled={isSaving}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Sem área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_DEPT}>Sem área</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button size="sm" className="w-full gap-1.5" onClick={handleSave} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Salvar alterações
      </Button>
    </div>
  );
}

function OrgPermissionSection({ node }: { node: HierarchyNode }) {
  const { data: people = [] } = usePeopleList();
  const updateMember = useUpdateMember();

  const userId = node.id.startsWith("member-") ? node.id.slice("member-".length) : null;
  const membership = userId ? people.find((p) => p.user_id === userId) : null;

  if (!userId || !membership || membership.role === "owner") return null;

  const hasPermission = membership.role === "admin";

  const toggle = () =>
    updateMember.mutate({
      membershipId: membership.id,
      userId,
      role: hasPermission ? "member" : "admin",
    });

  return (
    <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2 text-foreground">
        <Network className="h-4 w-4 shrink-0" />
        <span className="font-medium">Edição do organograma</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {hasPermission
          ? "Esta pessoa pode reorganizar o organograma via drag-and-drop."
          : "Esta pessoa não pode reorganizar o organograma."}
      </p>
      <Button
        size="sm"
        variant={hasPermission ? "outline" : "default"}
        className="w-full gap-1.5"
        onClick={toggle}
        disabled={updateMember.isPending}
      >
        {updateMember.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : hasPermission ? (
          <ShieldOff className="h-3.5 w-3.5" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5" />
        )}
        {hasPermission ? "Revogar acesso" : "Conceder acesso de edição"}
      </Button>
    </div>
  );
}

export function OrgMemberDrawer({ node, onOpenChange }: OrgMemberDrawerProps) {
  const open = !!node;
  const { isAdmin, role } = useUserPermissions();
  const isOwner = role === "owner";
  const { byUserId, isLoading: levelsLoading } = useOkrAccessLevels();
  const updateLevel = useUpdateOkrAccessLevel();

  const memberUserId =
    node?.type === "member" && node.id.startsWith("member-")
      ? node.id.slice("member-".length)
      : null;
  const accessRow = memberUserId ? byUserId.get(memberUserId) ?? null : null;
  const showOkrAccess = node?.type === "member" && isAdmin;
  const showOrgEdit = node?.type === "member" && isAdmin;
  const showOrgPermission = node?.type === "member" && isOwner;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        {node && (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={node.avatarUrl} alt={node.name} />
                  <AvatarFallback className="text-lg font-semibold">
                    {getInitials(node.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-lg">{node.name}</SheetTitle>
                  <SheetDescription className="text-sm">
                    {node.position || node.role}
                  </SheetDescription>
                  <Badge variant="secondary" className="mt-2">
                    {TYPE_LABEL[node.type]}
                  </Badge>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-4 text-sm">
              {node.email && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{node.email}</span>
                </div>
              )}
              {node.position && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Briefcase className="h-4 w-4 shrink-0" />
                  <span>{node.position}</span>
                </div>
              )}
              {node.department && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>{node.department}</span>
                </div>
              )}

              {showOrgEdit && (
                <OrgEditSection
                  node={node}
                  onClose={() => onOpenChange(false)}
                />
              )}

              {showOrgPermission && <OrgPermissionSection node={node} />}

              {showOkrAccess && (
                <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-foreground">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span className="font-medium">Acesso a OKR</span>
                  </div>
                  {levelsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Carregando…
                    </div>
                  ) : !accessRow ? (
                    <p className="text-xs text-muted-foreground">
                      Membership inativa ou não encontrada.
                    </p>
                  ) : (
                    <Select
                      value={accessRow.okr_access_level}
                      onValueChange={(v) =>
                        updateLevel.mutate({
                          membershipId: accessRow.id,
                          level: v as OkrAccessLevel,
                        })
                      }
                      disabled={updateLevel.isPending}
                    >
                      <SelectTrigger className="h-9" aria-label={`Nível de acesso de ${node.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="contributor">Contributor</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {node.children && node.children.length > 0 && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>
                    {node.children.length}{" "}
                    {node.type === "team" || node.type === "department" ? "membros" : "subordinados"}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
