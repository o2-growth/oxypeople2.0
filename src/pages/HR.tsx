import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { HRStats } from "@/components/hr/HRStats";
import { PipefySyncCard } from "@/components/hr/PipefySyncCard";
import { SyncHistoryList } from "@/components/hr/SyncHistoryList";
import { PipefyConfigDialog } from "@/components/hr/PipefyConfigDialog";
import { EditMemberDialog } from "@/components/hr/EditMemberDialog";
import { CollaboratorDetailDrawer } from "@/components/hr/CollaboratorDetailDrawer";
import { useHRTurnover } from "@/hooks/useHRTurnover";
import { useHeadcountAnalytics } from "@/hooks/useHeadcountAnalytics";
import { HRCalendarTab } from "@/components/hr/HRCalendarTab";
import { HRReportsTab } from "@/components/hr/HRReportsTab";
import { OrganizationChartFlow } from "@/components/people/OrganizationChartFlow";
import { FeedbackTab } from "@/components/people/FeedbackTab";
import { NPSTab } from "@/components/people/NPSTab";
import { CollaboratorCard } from "@/components/people/CollaboratorCard";
import { CollaboratorsFilters } from "@/components/people/CollaboratorsFilters";
import { InviteModal } from "@/components/company/InviteModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Briefcase, LayoutDashboard, Users, CalendarDays,
  FileBarChart, Network, ClipboardList, BarChart3, UserPlus,
  MoreHorizontal, Loader2, UserX, UserCheck, Mail, TrendingDown, Clock, TrendingUp,
  ArrowUpRight, ArrowDownRight, Trash2, X, ChevronUp, ChevronDown, ChevronsUpDown,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import {
  usePeopleList, usePeopleStats, useInviteMember, useUpdateMemberStatus, useDeleteMember,
  useBulkUpdateMembers, useBulkUpdateMemberRole, useBulkDeleteMembers, type CompanyMember,
} from "@/hooks/usePeopleList";
import { useDepartmentOptions, useUserBirthdays } from "@/hooks/usePeopleWithBirthdays";
import {
  isWithinInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, parseISO, getMonth, getDate,
} from "date-fns";

const statusLabels: Record<string, string> = {
  active: "Ativo",
  invited: "Convidado",
  pending: "Pendente",
  inactive: "Inativo",
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  invited: "bg-accent/10 text-accent border-accent/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  inactive: "bg-muted text-muted-foreground",
};

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Admin",
  manager: "Gestor",
  member: "Membro",
};

function TurnoverOverviewCards() {
  const { data, isLoading } = useHRTurnover();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const items = [
    { title: "Taxa de Turnover", value: `${data.turnoverRate}%`, icon: TrendingDown, bg: "bg-destructive/10", color: "text-destructive" },
    { title: "Tempo Médio (meses)", value: data.avgTenureMonths, icon: Clock, bg: "bg-primary/10", color: "text-primary" },
    { title: "Total Admissões", value: data.totalAdmissions, icon: TrendingUp, bg: "bg-success/10", color: "text-success" },
    { title: "Total Desligamentos", value: data.totalDepartures, icon: UserX, bg: "bg-warning/10", color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Card key={item.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.title}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg ${item.bg} flex items-center justify-center`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="admissions" name="Admissões" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="departures" name="Desligamentos" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Área</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.departmentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" allowDecimals={false} className="text-xs" />
                <YAxis type="category" dataKey="department" width={120} className="text-xs" />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="active" name="Ativos" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="inactive" name="Inativos" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HeadcountEvolutionChart() {
  const { data, isLoading } = useHeadcountAnalytics();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.monthlyHeadcount.length === 0) return null;

  const growthBadges = [
    { label: "6 meses", value: data.growth6m },
    { label: "1 ano", value: data.growth1y },
    { label: "2 anos", value: data.growth2y },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-lg">Evolução do Headcount</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total de colaboradores nos últimos 24 meses • Mediana de tempo de casa: <span className="font-semibold text-foreground">{data.medianTenureMonths} meses</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {growthBadges.map(b => (
              <div key={b.label} className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{b.label}</p>
                <Badge variant="outline" className={b.value >= 0 ? "text-success border-success/30 bg-success/10" : "text-destructive border-destructive/30 bg-destructive/10"}>
                  {b.value >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  {b.value >= 0 ? "+" : ""}{b.value}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.monthlyHeadcount}>
            <defs>
              <linearGradient id="headcountGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" className="text-xs" interval={2} />
            <YAxis className="text-xs" allowDecimals={false} />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg text-sm">
                    <p className="font-semibold">{label}</p>
                    <p className="text-foreground">{d.count} colaboradores</p>
                    {d.changePercent !== null && (
                      <p className={d.changePercent >= 0 ? "text-success" : "text-destructive"}>
                        {d.changePercent >= 0 ? "+" : ""}{d.changePercent}% vs mês anterior
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#headcountGradient)" dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function DepartmentDistributionChart() {
  const { data, isLoading } = useHeadcountAnalytics();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.departmentDistribution.length === 0) return null;

  const total = data.departmentDistribution.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Distribuição por Área</CardTitle>
        <p className="text-sm text-muted-foreground">Distribuição atual e crescimento do headcount</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Donut Chart */}
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.departmentDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="name"
                >
                  {data.departmentDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-lg text-sm">
                        <p className="font-semibold" style={{ color: d.color }}>{d.name}</p>
                        <p>{d.count} colaboradores ({Math.round((d.count / total) * 100)}%)</p>
                      </div>
                    );
                  }}
                />
                {/* Center label */}
                <text x="50%" y="48%" textAnchor="middle" className="fill-foreground text-2xl font-bold">{total}</text>
                <text x="50%" y="58%" textAnchor="middle" className="fill-muted-foreground text-xs">total</text>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Growth Table */}
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Área</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead className="text-right">6m</TableHead>
                  <TableHead className="text-right">1 ano</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.departmentDistribution.map(dept => (
                  <TableRow key={dept.name}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                        <span className="text-sm font-medium truncate">{dept.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{dept.count}</TableCell>
                    <TableCell className="text-right">
                      <span className={dept.growth6m >= 0 ? "text-success" : "text-destructive"}>
                        {dept.growth6m >= 0 ? "+" : ""}{dept.growth6m}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={dept.growth1y >= 0 ? "text-success" : "text-destructive"}>
                        {dept.growth1y >= 0 ? "+" : ""}{dept.growth1y}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HR() {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CompanyMember | null>(null);
  const [detailMembershipId, setDetailMembershipId] = useState<string | null>(null);
  const [deletingMember, setDeletingMember] = useState<CompanyMember | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  type SortCol = "name" | "position" | "department" | "role" | "status";
  // Lista carrega ordenada por nome (A–Z); cabeçalhos das colunas permitem alternar.
  const [sortCol, setSortCol] = useState<SortCol | null>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Collaborators filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [birthdayFilter, setBirthdayFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const { isAdmin } = useUserPermissions();
  const { data: people, isLoading: isLoadingPeople } = usePeopleList();
  const { data: stats, isLoading: isLoadingStats } = usePeopleStats();
  const { data: departments = [] } = useDepartmentOptions();
  const inviteMember = useInviteMember();
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

  // Clear selection when filters change
  useEffect(() => { setSelectedIds(new Set()); }, [searchQuery, departmentFilter, statusFilter, birthdayFilter]);

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
    const userIds = selectedMembers.map((m) => m.user_id);
    bulkUpdateRole.mutate({ userIds, role }, { onSuccess: clearSelection });
  };

  const handleBulkSetStatus = (status: "active" | "inactive") => {
    bulkUpdate.mutate({ membershipIds: [...selectedIds], status }, { onSuccess: clearSelection });
  };

  const handleBulkDelete = () => {
    bulkDelete.mutate([...selectedIds], { onSuccess: clearSelection });
    setBulkDeleteConfirm(false);
  };

  const handleInvite = (
    emails: string[],
    role: string,
    newHireData?: { isNewHire: boolean; hireDate?: Date; employmentType?: string }
  ) => {
    inviteMember.mutate({ emails, role, newHireData });
  };

  const handleToggleStatus = (membershipId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    updateStatus.mutate({ membershipId, status: newStatus });
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              Recursos Humanos
            </h1>
            <p className="text-muted-foreground mt-1">
              Hub completo de gestão de recursos humanos
            </p>
          </div>
          {isAdmin && (
            <Button
              className="gap-2 bg-gradient-primary hover:opacity-90 transition-opacity"
              onClick={() => setInviteModalOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              Convidar Pessoa
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="collaborators" className="gap-2">
              <Users className="h-4 w-4" />
              Colaboradores
            </TabsTrigger>
            <TabsTrigger value="orgchart" className="gap-2">
              <Network className="h-4 w-4" />
              Organograma
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="feedback" className="gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Feedback 30 Dias
                </TabsTrigger>
                <TabsTrigger value="nps" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  NPS
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <FileBarChart className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <HRStats />
            <TurnoverOverviewCards />
            <HeadcountEvolutionChart />
            <DepartmentDistributionChart />
            <div className="grid gap-6 md:grid-cols-2">
              <PipefySyncCard onConfigure={() => setConfigDialogOpen(true)} />
              <SyncHistoryList />
            </div>
          </TabsContent>

          <TabsContent value="collaborators">
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">
                        {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.total || 0}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-lg">👥</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ativos</p>
                      <p className="text-2xl font-bold">
                        {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.active || 0}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <span className="text-lg">✅</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Novos este mês</p>
                      <p className="text-2xl font-bold">
                        {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.newThisMonth || 0}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <span className="text-lg">🆕</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Áreas</p>
                      <p className="text-2xl font-bold">
                        {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.departments || 0}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <span className="text-lg">🏢</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/60 px-4 py-2 mb-2">
                <span className="text-sm font-medium shrink-0">
                  {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
                </span>
                <div className="flex flex-wrap items-center gap-2 ml-2">
                  <Select onValueChange={handleBulkSetDepartment}>
                    <SelectTrigger className="h-8 w-44 text-xs">
                      <SelectValue placeholder="Área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem área</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select onValueChange={(v) => handleBulkSetRole(v as "admin" | "manager" | "member")}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue placeholder="Função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Gestor</SelectItem>
                      <SelectItem value="member">Membro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                    onClick={() => handleBulkSetStatus("active")}>
                    <UserCheck className="h-3.5 w-3.5" /> Ativar
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                    onClick={() => handleBulkSetStatus("inactive")}>
                    <UserX className="h-3.5 w-3.5" /> Desativar
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8 text-xs gap-1"
                    onClick={() => setBulkDeleteConfirm(true)}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 ml-auto shrink-0"
                  onClick={clearSelection}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-heading mb-4">Colaboradores</CardTitle>
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
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPeople.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">
                      {hasActiveFilters ? "Nenhum resultado encontrado" : "Nenhum colaborador"}
                    </h3>
                    <p className="text-muted-foreground">
                      {hasActiveFilters ? "Tente ajustar os filtros" : "Convide membros para começar"}
                    </p>
                  </div>
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
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          {isAdmin && (
                            <TableHead className="w-[40px]">
                              <Checkbox
                                checked={allSelected}
                                data-state={someSelected ? "indeterminate" : undefined}
                                onCheckedChange={toggleSelectAll}
                                aria-label="Selecionar todos"
                              />
                            </TableHead>
                          )}
                          {(["name", "position", "department", "role", "status"] as SortCol[]).map((col) => {
                            const labels: Record<SortCol, string> = {
                              name: "Colaborador", position: "Cargo",
                              department: "Área", role: "Função", status: "Status",
                            };
                            const Icon = sortCol === col
                              ? sortDir === "asc" ? ChevronUp : ChevronDown
                              : ChevronsUpDown;
                            return (
                              <TableHead key={col}>
                                <button
                                  type="button"
                                  className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-foreground transition-colors"
                                  onClick={() => toggleSort(col)}
                                >
                                  {labels[col]}
                                  <Icon className="h-3.5 w-3.5 shrink-0" />
                                </button>
                              </TableHead>
                            );
                          })}
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPeople.map((person) => {
                          const initials = person.user?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?";
                          return (
                            <TableRow
                              key={person.id}
                              className={`hover:bg-muted/30 ${selectedIds.has(person.id) ? "bg-primary/5" : ""}`}
                            >
                              {isAdmin && (
                                <TableCell className="w-[40px]">
                                  <Checkbox
                                    checked={selectedIds.has(person.id)}
                                    onCheckedChange={() => toggleSelect(person.id)}
                                    aria-label={`Selecionar ${person.user?.full_name}`}
                                  />
                                </TableCell>
                              )}
                              <TableCell>
                                <button
                                  type="button"
                                  className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                                  onClick={() => setDetailMembershipId(person.id)}
                                >
                                  <Avatar className="h-10 w-10 shrink-0">
                                    <AvatarImage src={person.user?.avatar_url || undefined} alt={person.user?.full_name || ""} />
                                    <AvatarFallback>{initials}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium hover:underline">{person.user?.full_name || "Sem nome"}</p>
                                    <p className="text-sm text-muted-foreground">{person.user?.email}</p>
                                  </div>
                                </button>
                              </TableCell>
                              <TableCell>{person.position || <span className="text-muted-foreground">—</span>}</TableCell>
                              <TableCell>
                                {person.department_info ? (
                                  <Badge variant="outline" style={{
                                    backgroundColor: `${person.department_info.color}15`,
                                    color: person.department_info.color || undefined,
                                    borderColor: `${person.department_info.color}30`,
                                  }}>
                                    {person.department_info.name}
                                  </Badge>
                                ) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{roleLabels[person.role || "member"]}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={statusColors[person.status] || ""}>
                                  {statusLabels[person.status] || person.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isAdmin && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8"
                                        onClick={(e) => e.stopPropagation()}>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`mailto:${person.user?.email}`, "_blank"); }}>
                                        <Mail className="h-4 w-4 mr-2" />
                                        Enviar email
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {person.status === "active" ? (
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleStatus(person.id, person.status); }} className="text-destructive">
                                          <UserX className="h-4 w-4 mr-2" />
                                          Desativar
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleStatus(person.id, person.status); }}>
                                          <UserCheck className="h-4 w-4 mr-2" />
                                          Ativar
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={(e) => { e.stopPropagation(); setDeletingMember(person); }}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir colaborador
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orgchart">
            <OrganizationChartFlow />
          </TabsContent>

          <TabsContent value="feedback">
            {isAdmin && <FeedbackTab />}
          </TabsContent>

          <TabsContent value="nps">
            {isAdmin && <NPSTab />}
          </TabsContent>


          <TabsContent value="calendar">
            <HRCalendarTab />
          </TabsContent>

          <TabsContent value="reports">
            <HRReportsTab />
          </TabsContent>
        </Tabs>

        {/* Config Dialog */}
        <PipefyConfigDialog open={configDialogOpen} onOpenChange={setConfigDialogOpen} />

        {/* Invite Modal */}
        <InviteModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} onInvite={handleInvite} />

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
      </div>

      <CollaboratorDetailDrawer
        membershipId={detailMembershipId}
        open={!!detailMembershipId}
        onOpenChange={(open) => { if (!open) setDetailMembershipId(null); }}
        isAdmin={isAdmin}
      />
    </AppLayout>
  );
}
