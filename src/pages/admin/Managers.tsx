import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Network,
  Search,
  UserCog,
  X,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useManagers, type ManagerMembershipRow } from "@/hooks/useManagers";
import { MultiPersonSelector } from "@/components/objectives/MultiPersonSelector";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function collectSubtree(
  rootUserId: string,
  childrenByManager: Map<string, Set<string>>,
): Set<string> {
  const out = new Set<string>([rootUserId]);
  const stack = [rootUserId];
  while (stack.length) {
    const u = stack.pop()!;
    const kids = childrenByManager.get(u);
    if (!kids) continue;
    for (const k of kids) {
      if (!out.has(k)) {
        out.add(k);
        stack.push(k);
      }
    }
  }
  return out;
}

export default function ManagersAdminPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: permsLoading } = useUserPermissions();
  const {
    members,
    directSubordinatesByUserId,
    isLoading,
    setManager,
    bulkSetManager,
    isMutating,
  } = useManagers();

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [singleTarget, setSingleTarget] = useState<ManagerMembershipRow | null>(null);
  const [singlePicker, setSinglePicker] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPicker, setBulkPicker] = useState<string[]>([]);

  useEffect(() => {
    if (!permsLoading && !isAdmin) {
      toast.error("Sem permissão para gerenciar gestores.");
      navigate("/", { replace: true });
    }
  }, [isAdmin, permsLoading, navigate]);

  const departmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => {
      if (m.department_id && m.department_name) {
        map.set(m.department_id, m.department_name);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => {
        if (departmentFilter !== "all" && m.department_id !== departmentFilter) return false;
        if (!q) return true;
        const haystack = [m.full_name, m.email, m.position, m.department_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [members, search, departmentFilter]);

  const allFilteredSelected =
    filteredMembers.length > 0 && filteredMembers.every((m) => selectedRows.has(m.user_id));

  const handleToggleAll = () => {
    if (allFilteredSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredMembers.map((m) => m.user_id)));
    }
  };

  const handleToggleRow = (userId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const openSinglePicker = (row: ManagerMembershipRow) => {
    setSingleTarget(row);
    setSinglePicker(row.manager_id ? [row.manager_id] : []);
  };

  const closeSinglePicker = () => {
    setSingleTarget(null);
    setSinglePicker([]);
  };

  const handleSingleSave = async () => {
    if (!singleTarget) return;
    const newManagerId = singlePicker[0] ?? null;
    if (newManagerId === singleTarget.manager_id) {
      closeSinglePicker();
      return;
    }
    try {
      await setManager(singleTarget.user_id, newManagerId);
      closeSinglePicker();
    } catch {
      // toast handled in hook
    }
  };

  const handleSingleClear = async () => {
    if (!singleTarget) return;
    try {
      await setManager(singleTarget.user_id, null);
      closeSinglePicker();
    } catch {
      /* noop */
    }
  };

  const openBulkPicker = () => {
    if (selectedRows.size === 0) {
      toast.error("Selecione ao menos uma pessoa.");
      return;
    }
    setBulkPicker([]);
    setBulkOpen(true);
  };

  const handleBulkSave = async () => {
    const newManagerId = bulkPicker[0] ?? null;
    try {
      await bulkSetManager(Array.from(selectedRows), newManagerId);
      setBulkOpen(false);
      setBulkPicker([]);
      setSelectedRows(new Set());
    } catch {
      /* noop */
    }
  };

  const handleBulkClear = async () => {
    try {
      await bulkSetManager(Array.from(selectedRows), null);
      setBulkOpen(false);
      setBulkPicker([]);
      setSelectedRows(new Set());
    } catch {
      /* noop */
    }
  };

  // For the single picker, exclude self + direct subordinates so we don't
  // create the most obvious cycle (DB trigger still catches deeper cycles).
  const singleExcludeIds = useMemo(() => {
    if (!singleTarget) return [] as string[];
    const subtree = collectSubtree(singleTarget.user_id, directSubordinatesByUserId);
    return Array.from(subtree);
  }, [singleTarget, directSubordinatesByUserId]);

  // For bulk: exclude all selected users + their direct subordinates.
  const bulkExcludeIds = useMemo(() => {
    const out = new Set<string>();
    selectedRows.forEach((uid) => {
      collectSubtree(uid, directSubordinatesByUserId).forEach((id) => out.add(id));
    });
    return Array.from(out);
  }, [selectedRows, directSubordinatesByUserId]);

  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Network className="h-6 w-6" />
              Gestores
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Defina quem responde a quem. Ciclos são bloqueados pelo banco.
            </p>
          </div>
          <Button
            onClick={openBulkPicker}
            disabled={selectedRows.size === 0 || isMutating}
            className="gap-1.5"
          >
            <Users className="h-4 w-4" />
            Definir mesmo gestor ({selectedRows.size})
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pessoas da empresa</CardTitle>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="relative min-w-[200px] flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, e-mail, cargo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-9 w-56">
                  <SelectValue placeholder="Área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as áreas</SelectItem>
                  {departmentOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Nenhuma pessoa encontrada.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allFilteredSelected}
                        onCheckedChange={handleToggleAll}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Gestor atual</TableHead>
                    <TableHead className="w-32 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(m.user_id)}
                          onCheckedChange={() => handleToggleRow(m.user_id)}
                          aria-label={`Selecionar ${m.full_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(m.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{m.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{m.position || "—"}</TableCell>
                      <TableCell className="text-sm">{m.department_name || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {m.manager_name ? (
                          <Badge variant="secondary">{m.manager_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => openSinglePicker(m)}
                          disabled={isMutating}
                        >
                          <UserCog className="h-4 w-4" />
                          Definir gestor
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Single-row picker */}
      <Dialog
        open={!!singleTarget}
        onOpenChange={(open) => {
          if (!open) closeSinglePicker();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir gestor</DialogTitle>
            <DialogDescription>
              {singleTarget ? `Selecione o gestor de ${singleTarget.full_name}.` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <MultiPersonSelector
              value={singlePicker.slice(0, 1)}
              onValueChange={(ids) => setSinglePicker(ids.slice(-1))}
              placeholder="Selecionar gestor"
              excludeIds={singleExcludeIds}
            />
            {singleTarget?.manager_id && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSingleClear}
                className="gap-1.5 text-muted-foreground"
                disabled={isMutating}
              >
                <X className="h-3.5 w-3.5" />
                Remover gestor atual
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeSinglePicker} disabled={isMutating}>
              Cancelar
            </Button>
            <Button onClick={handleSingleSave} disabled={isMutating}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk picker */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir gestor para {selectedRows.size} pessoa(s)</DialogTitle>
            <DialogDescription>
              O gestor escolhido será aplicado a todas as pessoas selecionadas. Atribuições que
              criariam ciclo são bloqueadas individualmente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <MultiPersonSelector
              value={bulkPicker.slice(0, 1)}
              onValueChange={(ids) => setBulkPicker(ids.slice(-1))}
              placeholder="Selecionar gestor"
              excludeIds={bulkExcludeIds}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBulkClear}
              className="gap-1.5 text-muted-foreground"
              disabled={isMutating}
            >
              <X className="h-3.5 w-3.5" />
              Remover gestor de todas
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={isMutating}>
              Cancelar
            </Button>
            <Button
              onClick={handleBulkSave}
              disabled={isMutating || bulkPicker.length === 0}
            >
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
