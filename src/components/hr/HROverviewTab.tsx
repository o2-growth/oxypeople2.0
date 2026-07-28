import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { QueryError } from "@/components/QueryError";
import { EmptyState } from "@/components/ui/empty-state";
import { HRStats } from "@/components/hr/HRStats";
import { PipefySyncCard } from "@/components/hr/PipefySyncCard";
import { SyncHistoryList } from "@/components/hr/SyncHistoryList";
import { useHRTurnover } from "@/hooks/useHRTurnover";
import { useHeadcountAnalytics } from "@/hooks/useHeadcountAnalytics";
import {
  TrendingDown, Clock, TrendingUp, UserX, ArrowUpRight, ArrowDownRight, BarChart3,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";

function ChartCardSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full rounded-xl" style={{ height }} />
      </CardContent>
    </Card>
  );
}

function TurnoverOverviewCards() {
  const { data, isLoading, isError, refetch } = useHRTurnover();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-0">
          <QueryError
            message="Não foi possível carregar os dados de turnover."
            onRetry={() => refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={BarChart3}
            title="Sem dados de turnover"
            description="Os indicadores aparecem assim que houver movimentações de colaboradores."
          />
        </CardContent>
      </Card>
    );
  }

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
  const { data, isLoading, isError, refetch } = useHeadcountAnalytics();

  if (isLoading) {
    return <ChartCardSkeleton />;
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-0">
          <QueryError
            message="Não foi possível carregar a evolução do headcount."
            onRetry={() => refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.monthlyHeadcount.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={BarChart3}
            title="Sem histórico de headcount"
            description="A evolução aparece quando houver colaboradores com data de admissão."
          />
        </CardContent>
      </Card>
    );
  }

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
  const { data, isLoading, isError, refetch } = useHeadcountAnalytics();

  if (isLoading) {
    return <ChartCardSkeleton height={280} />;
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-0">
          <QueryError
            message="Não foi possível carregar a distribuição por área."
            onRetry={() => refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.departmentDistribution.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={BarChart3}
            title="Sem distribuição por área"
            description="Vincule colaboradores a áreas para visualizar a distribuição."
          />
        </CardContent>
      </Card>
    );
  }

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

interface HROverviewTabProps {
  onConfigurePipefy: () => void;
}

export function HROverviewTab({ onConfigurePipefy }: HROverviewTabProps) {
  return (
    <div className="space-y-6">
      <HRStats />
      <TurnoverOverviewCards />
      <HeadcountEvolutionChart />
      <DepartmentDistributionChart />
      <div className="grid gap-6 md:grid-cols-2">
        <PipefySyncCard onConfigure={onConfigurePipefy} />
        <SyncHistoryList />
      </div>
    </div>
  );
}
