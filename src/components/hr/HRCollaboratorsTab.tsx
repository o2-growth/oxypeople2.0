import { useState, useMemo, type Dispatch, type SetStateAction } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QueryError } from "@/components/QueryError";
import { EmptyState } from "@/components/ui/empty-state";
import { CollaboratorsFilters } from "@/components/people/CollaboratorsFilters";
import { CollaboratorCard } from "@/components/people/CollaboratorCard";
import { CollaboratorDetailDrawer } from "@/components/hr/CollaboratorDetailDrawer";
import { EditMemberDialog } from "@/components/hr/EditMemberDialog";
import { HRCollaboratorStats } from "@/components/hr/HRCollaboratorStats";
import { HRBulkActionBar } from "@/components/hr/HRBulkActionBar";
import { HRCollaboratorsTable, type SortCol } from "@/components/hr/HRCollaboratorsTable";
import {
  usePeopleList, useUpdateMemberStatus, useDeleteMember,
  useBulkUpdateMembers, useBulkUpdateMemberRole, useBulkDeleteMembers, type CompanyMember,
} from "@/hooks/usePeopleList";
import { useDepartmentOptions, useUserBirthdays } from "@/hooks/usePeopleWithBirthdays";
import {
  isWithinInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, parseISO, getMonth, getDate,
} from "date-fns";

interface HRCollaboratorsTabProps {
  isAdmin: boolean;
  // Filtros + seleção + ordenação + visão são controlados pela página (HR.tsx)
  // para sobreviverem à troca de aba (o Radix desmonta o TabsContent inativo). O
  // container mantém toda a lógica derivada; só o estado-raiz vive acima.
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  departmentFilter: string;
  setDepartmentFilter: Dispatch<SetStateAction<string>>;
  statusFilter: string;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  birthdayFilter: string;
  setBirthdayFilter: Dispatch<SetStateAction<string>>;
  selectedIds: Set<string>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  sortCol: SortCol | null;
  setSortCol: Dispatch<SetStateAction<SortCol | null>>;
  sortDir: "asc" | "desc";
  setSortDir: Dispatch<SetStateAction<"asc" | "desc">>;
  viewMode: "table" | "cards";
  setViewMode: Dispatch<SetStateAction<"table" | "cards">>;
}

export function HRCollaboratorsTab({
  isAdmin,
  searchQuery,
  setSearchQuery,
  departmentFilter,
  setDepartmentFilter,
  statusFilter,
  setStatusFilter,
  birthdayFilter,
  setBirthdayFilter,
  selectedIds,
  setSelectedIds,
  sortCol,
  setSortCol,
  sortDir,
  setSortDir,
  viewMode,
  setViewMode,
}: HRCollaboratorsTabProps) {
  const [editingMember, setEditingMember] = useState<CompanyMember | null>(null);
  const [detailMembershipId, setDetailMembershipId] = useState<string | null>(null);
  const [deletingMember, setDeletingMember] = useState<CompanyMember | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const { data: people, isLoading: isLoadingPeople, isError, refetch } = usePeopleList();
  const { data: departments = [] } = useDepartmentOptions();
  const updateStatus = useUpdateMemberStatus();
  const deleteMember = useDeleteMember();
  const bulkUpdate = useBulkUpdateMembers();
  const bulkUpdateRole = useBulkUpdateMemberRole();
  const bulkDelete = useBulkDeleteMembers();

  const userIds = useMemo(() => people?.map((p) => p.user_id) || [], [people]);
  const { data: birthdaysMap = new Map() } = useUserBirthdays(userIds);

  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== "" || departmentFilter !== "all" || statusFilter !== "all" || birthdayFilter !== "all";
  }, [searchQuery, departmentFilter, statusFilter, birthdayFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setDepartmentFilter("all");
    setStatusFilter("all");
    setBirthdayFilter("all");
  };

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const filteredPeople = useMemo(() => {
    if (!people) return [];
    const filtered = people.filter((person) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          person.user?.full_name?.toLowerCase().includes(query) ||
          person.user?.email?.toLowerCase().includes(query) ||
          person.position?.toLowerCase().includes(query) ||
          person.department_info?.name?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (departmentFilter !== "all" && person.department_id !== departmentFilter) return false;
      if (statusFilter !== "all" && person.status !== statusFilter) return false;
      if (birthdayFilter !== "all") {
        const birthDate = birthdaysMap.get(person.user_id);
        if (!birthDate) return false;
        const now = new Date();
        const birthday = parseISO(birthDate);
        const birthdayMonth = getMonth(birthday);
        const birthdayDay = getDate(birthday);
        const thisYearBirthday = new Date(now.getFullYear(), birthdayMonth, birthdayDay);
        if (birthdayFilter === "this_month") {
          if (!isWithinInterval(thisYearBirthday, { start: startOfMonth(now), end: endOfMonth(now) })) return false;
        } else if (birthdayFilter === "next_month") {
          const nextMonthStart = startOfMonth(addMonths(now, 1));
          const nextMonthEnd = endOfMonth(addMonths(now, 1));
          const nextYearBirthday = new Date(nextMonthStart.getFullYear(), birthdayMonth, birthdayDay);
          if (!isWithinInterval(nextYearBirthday, { start: nextMonthStart, end: nextMonthEnd })) return false;
        } else if (birthdayFilter === "this_week") {
          if (!isWithinInterval(thisYearBirthday, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) })) return false;
        }
      }
      return true;
    });

    if (!sortCol) return filtered;

    const getValue = (p: CompanyMember): string => {
      switch (sortCol) {
        case "name": return p.user?.full_name?.toLowerCase() ?? p.user?.email?.toLowerCase() ?? "";
        case "position": return p.position?.toLowerCase() ?? "";
        case "department": return p.department_info?.name?.toLowerCase() ?? "";
        case "role": return p.role ?? "";
        case "status": return p.status ?? "";
      }
    };

    return [...filtered].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      const cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [people, searchQuery, departmentFilter, statusFilter, birthdayFilter, birthdaysMap, sortCol, sortDir]);

  const allFilteredIds = useMemo(() => filteredPeople.map((p) => p.id), [filteredPeople]);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const someSelected = allFilteredIds.some((id) => selectedIds.has(id)) && !allSelected;

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(allFilteredIds));

  const clearSelection = () => setSelectedIds(new Set());

  const selectedMembers = useMemo(
    () => filteredPeople.filter((p) => selectedIds.has(p.id)),
    [filteredPeople, selectedIds],
  );

  const handleBulkSetDepartment = (deptId: string) => {
    const ids = [...selectedIds];
    bulkUpdate.mutate({ membershipIds: ids, department_id: deptId === "__none__" ? null : deptId },
      { onSuccess: clearSelection });
  };

  const handleBulkSetRole = (role: "admin" | "manager" | "member") => {
    const memberUserIds = selectedMembers.map((m) => m.user_id);
    bulkUpdateRole.mutate({ userIds: memberUserIds, role }, { onSuccess: clearSelection });
  };

  const handleBulkSetStatus = (status: "active" | "inactive") => {
    bulkUpdate.mutate({ membershipIds: [...selectedIds], status }, { onSuccess: clearSelection });
  };

  const handleBulkDelete = () => {
    bulkDelete.mutate([...selectedIds], { onSuccess: clearSelection });
    setBulkDeleteConfirm(false);
  };

  const handleToggleStatus = (membershipId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    updateStatus.mutate({ membershipId, status: newStatus });
  };

  return (
    <>
      <HRCollaboratorStats />

      {selectedIds.size > 0 && (
        <HRBulkActionBar
          selectedCount={selectedIds.size}
          departments={departments}
          onSetDepartment={handleBulkSetDepartment}
          onSetRole={handleBulkSetRole}
          onSetStatus={handleBulkSetStatus}
          onDelete={() => setBulkDeleteConfirm(true)}
          onClear={clearSelection}
        />
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg mb-4">Colaboradores</CardTitle>
          <CollaboratorsFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            departmentFilter={departmentFilter}
            onDepartmentChange={setDepartmentFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            birthdayFilter={birthdayFilter}
            onBirthdayChange={setBirthdayFilter}
            departments={departments}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </CardHeader>
        <CardContent>
          {isLoadingPeople ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <QueryError
              message="Não foi possível carregar os colaboradores."
              onRetry={() => refetch()}
            />
          ) : filteredPeople.length === 0 ? (
            <EmptyState
              icon={Users}
              title={hasActiveFilters ? "Nenhum resultado encontrado" : "Nenhum colaborador"}
              description={hasActiveFilters ? "Tente ajustar os filtros" : "Convide membros para começar"}
            />
          ) : viewMode === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPeople.map((person) => (
                <CollaboratorCard
                  key={person.id}
                  member={person}
                  birthDate={birthdaysMap.get(person.user_id)}
                  isAdmin={isAdmin}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>
          ) : (
            <HRCollaboratorsTable
              people={filteredPeople}
              isAdmin={isAdmin}
              sortCol={sortCol}
              sortDir={sortDir}
              onToggleSort={toggleSort}
              selectedIds={selectedIds}
              allSelected={allSelected}
              someSelected={someSelected}
              onToggleSelectAll={toggleSelectAll}
              onToggleSelect={toggleSelect}
              onOpenDetail={setDetailMembershipId}
              onEdit={setEditingMember}
              onToggleStatus={handleToggleStatus}
              onDelete={setDeletingMember}
            />
          )}
        </CardContent>
      </Card>

      {/* Member Detail Drawer */}
      <CollaboratorDetailDrawer
        membershipId={detailMembershipId}
        open={!!detailMembershipId}
        onOpenChange={(open) => { if (!open) setDetailMembershipId(null); }}
        isAdmin={isAdmin}
      />

      {/* Edit Member Dialog */}
      <EditMemberDialog
        member={editingMember}
        open={!!editingMember}
        onOpenChange={(open) => { if (!open) setEditingMember(null); }}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} colaborador{selectedIds.size > 1 ? "es" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingMember} onOpenChange={(open) => { if (!open) setDeletingMember(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deletingMember?.user?.full_name || deletingMember?.user?.email}</strong> será removido permanentemente da empresa. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingMember) deleteMember.mutate(deletingMember.id);
                setDeletingMember(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
