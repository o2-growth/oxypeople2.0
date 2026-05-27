import { useState, useMemo, useCallback } from "react";
import { useObjectiveTree, ObjectiveWithDetails, ObjectiveType, ObjectiveStatus } from "./useObjectives";
import { useUserPermissions } from "./useUserPermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useOkrSettings } from "./useCheckins";
import { useDepartmentOptions } from "./usePeopleWithBirthdays";
import { useTeams } from "./useTeams";

export type ViewMode = "company" | "department" | "my";

export interface QuarterFilter {
  year: number;
  quarter: 1 | 2 | 3 | 4;
}

export type CommitmentFilterValue = "all" | "committed" | "aspirational";

export interface ObjectivesFilterState {
  departments: string[];
  teamIds: string[];
  responsibleIds: string[];
  periodId: string | null;
  statuses: ObjectiveStatus[];
  objectiveTypes: ObjectiveType[];
  progressRange: [number, number] | null;
  quarterFilter: QuarterFilter;
  commitmentFilter: CommitmentFilterValue;
  // Quick filters
  atRisk: boolean;
  checkinOverdue: boolean;
  noKR: boolean;
  search: string;
}

export interface ObjectivesStats {
  total: number;
  strategic: number;
  tactical: number;
  operational: number;
  averageProgress: number;
  byStatus: Record<string, number>;
  atRiskCount: number;
  overdueCheckinCount: number;
  noKRCount: number;
}

function getCurrentQuarter(): QuarterFilter {
  const now = new Date();
  return {
    year: now.getFullYear(),
    quarter: (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4,
  };
}

function getQuarterDateRange(q: QuarterFilter): { start: Date; end: Date } {
  const startMonth = (q.quarter - 1) * 3;
  return {
    start: new Date(q.year, startMonth, 1),
    end: new Date(q.year, startMonth + 3, 0, 23, 59, 59),
  };
}

const defaultFilters: ObjectivesFilterState = {
  departments: [],
  teamIds: [],
  responsibleIds: [],
  periodId: null,
  statuses: [],
  objectiveTypes: [],
  progressRange: null,
  quarterFilter: getCurrentQuarter(),
  commitmentFilter: "all",
  atRisk: false,
  checkinOverdue: false,
  noKR: false,
  search: "",
};

function getOverdueDays(frequency?: string): number {
  switch (frequency) {
    case "biweekly": return 14;
    case "monthly": return 30;
    case "weekly":
    default: return 7;
  }
}

function isCheckinOverdue(obj: ObjectiveWithDetails, overdueDays = 7): boolean {
  if (obj.type !== "operational") return false;
  if (obj.key_results.length === 0) return false;
  const now = new Date();
  return obj.key_results.some((kr) => {
    const lastCheckin = (kr as any).last_checkin_at;
    if (!lastCheckin) return true;
    const diff = (now.getTime() - new Date(lastCheckin).getTime()) / (1000 * 60 * 60 * 24);
    return diff > overdueDays;
  });
}

function isAtRisk(obj: ObjectiveWithDetails): boolean {
  const autoStatus = (obj as any).auto_status;
  return autoStatus === "risk" || autoStatus === "overdue" || obj.status === "risk";
}

function hasNoKR(obj: ObjectiveWithDetails): boolean {
  return obj.type === "operational" && obj.key_results.length === 0;
}

export function useObjectivesFilters() {
  const [filters, setFilters] = useState<ObjectivesFilterState>(defaultFilters);
  const [viewMode, setViewMode] = useState<ViewMode>("company");
  const { tree, flatObjectives, isLoading } = useObjectiveTree();
  const { user } = useAuth();
  const { isAdmin, ledTeamIds } = useUserPermissions();
  const { data: okrSettings } = useOkrSettings();
  const overdueDays = getOverdueDays(okrSettings?.checkin_frequency);

  // Get departments from the departments table (always reflects the official org structure)
  const { data: deptOptions = [] } = useDepartmentOptions();
  const departments = useMemo(
    () => deptOptions.map((d) => d.name),
    [deptOptions]
  );

  // Get teams for the team filter
  const { data: teams = [] } = useTeams();

  // Get unique responsible users
  const responsibleUsers = useMemo(() => {
    const usersMap = new Map<string, { id: string; name: string; email: string; avatar_url: string | null }>();
    flatObjectives.forEach((obj) => {
      if (obj.owner && !usersMap.has(obj.owner.id)) {
        usersMap.set(obj.owner.id, {
          id: obj.owner.id,
          name: obj.owner.full_name || obj.owner.email,
          email: obj.owner.email,
          avatar_url: obj.owner.avatar_url,
        });
      }
    });
    return Array.from(usersMap.values());
  }, [flatObjectives]);

  // Determine user's department for "department" view
  const userDepartment = useMemo(() => {
    const myObj = flatObjectives.find((o) => o.owner_id === user?.id);
    return myObj?.department || (myObj?.team as any)?.department || null;
  }, [flatObjectives, user?.id]);

  // Filter flat objectives
  const filteredObjectives = useMemo(() => {
    const { start, end } = getQuarterDateRange(filters.quarterFilter);

    return flatObjectives.filter((obj) => {
      // Quarter filter — always active, based on due_date
      if (!obj.due_date) return false;
      const dueDate = new Date(obj.due_date);
      if (dueDate < start || dueDate > end) return false;

      // Commitment filter
      if (filters.commitmentFilter !== "all") {
        const objCommitment = (obj as any).commitment_type ?? "committed";
        if (objCommitment !== filters.commitmentFilter) return false;
      }

      // View mode filter
      if (viewMode === "my") {
        if (obj.owner_id !== user?.id && obj.assignee_id !== user?.id) return false;
      } else if (viewMode === "department" && userDepartment) {
        const objDept = obj.department || (obj.team as any)?.department;
        if (objDept !== userDepartment) return false;
      }

      // Department (área) filter
      if (filters.departments.length > 0) {
        const objDept = obj.department || (obj.team as any)?.department;
        if (!objDept || !filters.departments.includes(objDept)) return false;
      }

      // Team filter
      if (filters.teamIds.length > 0) {
        if (!obj.team_id || !filters.teamIds.includes(obj.team_id)) return false;
      }

      // Responsible filter
      if (filters.responsibleIds.length > 0) {
        if (!obj.owner || !filters.responsibleIds.includes(obj.owner.id)) return false;
      }

      // Period filter
      if (filters.periodId) {
        if (obj.period_id !== filters.periodId) return false;
      }

      // Status filter
      if (filters.statuses.length > 0) {
        if (!filters.statuses.includes(obj.status)) return false;
      }

      // Type filter
      if (filters.objectiveTypes.length > 0) {
        if (!filters.objectiveTypes.includes(obj.type)) return false;
      }

      // Progress range
      if (filters.progressRange) {
        const [min, max] = filters.progressRange;
        if (obj.progress < min || obj.progress > max) return false;
      }

      // Quick filters
      if (filters.atRisk && !isAtRisk(obj)) return false;
      if (filters.checkinOverdue && !isCheckinOverdue(obj, overdueDays)) return false;
      if (filters.noKR && !hasNoKR(obj)) return false;

      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchTitle = obj.title.toLowerCase().includes(q);
        const matchOwner = obj.owner?.full_name?.toLowerCase().includes(q) || obj.owner?.email.toLowerCase().includes(q);
        const matchKR = obj.key_results.some((kr) => kr.title.toLowerCase().includes(q));
        if (!matchTitle && !matchOwner && !matchKR) return false;
      }

      return true;
    });
  }, [flatObjectives, filters, viewMode, user?.id, userDepartment, overdueDays]);

  // Filtered tree (keep parents visible if children match)
  const filteredTree = useMemo(() => {
    const matchingIds = new Set(filteredObjectives.map((o) => o.id));

    function filterNode(node: ObjectiveWithDetails): ObjectiveWithDetails | null {
      const filteredChildren = (node.children || [])
        .map(filterNode)
        .filter(Boolean) as ObjectiveWithDetails[];

      if (matchingIds.has(node.id) || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    }

    return tree.map(filterNode).filter(Boolean) as ObjectiveWithDetails[];
  }, [tree, filteredObjectives]);

  // Stats
  const stats = useMemo((): ObjectivesStats => {
    const total = flatObjectives.length;
    const strategic = flatObjectives.filter((o) => o.type === "strategic").length;
    const tactical = flatObjectives.filter((o) => o.type === "tactical").length;
    const operational = flatObjectives.filter((o) => o.type === "operational").length;
    const averageProgress = total > 0
      ? Math.round(flatObjectives.reduce((sum, obj) => sum + obj.progress, 0) / total)
      : 0;

    const byStatus: Record<string, number> = {};
    flatObjectives.forEach((obj) => {
      byStatus[obj.status] = (byStatus[obj.status] || 0) + 1;
    });

    const atRiskCount = flatObjectives.filter(isAtRisk).length;
    const overdueCheckinCount = flatObjectives.filter((o) => isCheckinOverdue(o, overdueDays)).length;
    const noKRCount = flatObjectives.filter(hasNoKR).length;

    return { total, strategic, tactical, operational, averageProgress, byStatus, atRiskCount, overdueCheckinCount, noKRCount };
  }, [flatObjectives, overdueDays]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.departments.length > 0 ||
      filters.teamIds.length > 0 ||
      filters.responsibleIds.length > 0 ||
      filters.periodId !== null ||
      filters.statuses.length > 0 ||
      filters.objectiveTypes.length > 0 ||
      filters.progressRange !== null ||
      filters.commitmentFilter !== "all" ||
      filters.atRisk ||
      filters.checkinOverdue ||
      filters.noKR ||
      filters.search !== ""
    );
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({ ...defaultFilters, quarterFilter: prev.quarterFilter }));
  }, []);

  return {
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
    filteredObjectives,
    filteredTree,
    tree,
    stats,
    departments,
    teams,
    responsibleUsers,
    isLoading,
    viewMode,
    setViewMode,
  };
}

export { getCurrentQuarter, getQuarterDateRange };
