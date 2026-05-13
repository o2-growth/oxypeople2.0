import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import type { DeptRow } from "@/hooks/usePDIDashboard";

interface DrillMemberRow {
  user_id: string;
  user_name: string | null;
  plan_id: string | null;
  plan_title: string | null;
  plan_progress: number | null;
  plan_status: string | null;
}

interface DrillData {
  user_id: string;
  users: { id: string; full_name: string | null } | null;
  pdi_plans: Array<{ id: string; title: string; progress: number; status: string }> | null;
}

function useDeptDrillDown(deptId: string | null, companyId: string) {
  return useQuery({
    queryKey: ["pdi-dept-drill", deptId, companyId],
    queryFn: async (): Promise<DrillMemberRow[]> => {
      if (!deptId) return [];
      const { data, error } = await supabase
        .from("company_memberships")
        .select(
          "user_id, users!company_memberships_user_id_fkey(id, full_name), pdi_plans!pdi_plans_user_id_fkey(id, title, progress, status)",
        )
        .eq("department_id", deptId)
        .eq("company_id", companyId)
        .eq("status", "active");

      if (error) throw error;

      const rows: DrillMemberRow[] = [];
      (data ?? []).forEach((m: unknown) => {
        const member = m as DrillData;
        const plans = Array.isArray(member.pdi_plans) ? member.pdi_plans : [];
        if (plans.length === 0) {
          rows.push({
            user_id: member.user_id,
            user_name: member.users?.full_name ?? null,
            plan_id: null,
            plan_title: null,
            plan_progress: null,
            plan_status: null,
          });
        } else {
          plans.forEach((p) => {
            rows.push({
              user_id: member.user_id,
              user_name: member.users?.full_name ?? null,
              plan_id: p.id,
              plan_title: p.title,
              plan_progress: p.progress,
              plan_status: p.status,
            });
          });
        }
      });

      return rows;
    },
    enabled: !!deptId && !!companyId,
  });
}

interface DepartmentTableProps {
  rows: DeptRow[];
}

export function DepartmentTable({ rows }: DepartmentTableProps) {
  const [selectedDept, setSelectedDept] = useState<DeptRow | null>(null);
  const { profile } = useUser();
  const companyId = profile?.primary_company_id ?? "";
  const navigate = useNavigate();

  const drillQuery = useDeptDrillDown(
    selectedDept?.dept_id ?? null,
    companyId,
  );

  const handleRowClick = (row: DeptRow) => {
    if (row.dept_id == null) return;
    setSelectedDept(row);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PDIs por departamento</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Departamento</TableHead>
                <TableHead className="text-right">Pessoas</TableHead>
                <TableHead className="text-right">PDIs ativos</TableHead>
                <TableHead className="text-right">Concluídos</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Progresso médio</TableHead>
                <TableHead className="text-right">Cobertura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum dado disponível.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.dept_id ?? "__null__"}
                    className={row.dept_id != null ? "cursor-pointer hover:bg-muted/50" : undefined}
                    onClick={() => handleRowClick(row)}
                  >
                    <TableCell className="font-medium">{row.dept_name}</TableCell>
                    <TableCell className="text-right">{row.people_count}</TableCell>
                    <TableCell className="text-right">{row.active_count}</TableCell>
                    <TableCell className="text-right">{row.completed_count}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      {row.avg_progress.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          row.coverage_pct >= 80
                            ? "text-emerald-600"
                            : row.coverage_pct >= 50
                              ? "text-amber-600"
                              : "text-destructive"
                        }
                      >
                        {row.coverage_pct.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedDept} onOpenChange={(open) => !open && setSelectedDept(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedDept?.dept_name} — PDIs</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {drillQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : drillQuery.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum membro encontrado neste departamento.
              </p>
            ) : (
              drillQuery.data?.map((row, idx) => (
                <div
                  key={`${row.user_id}-${row.plan_id ?? idx}`}
                  className={
                    row.plan_id
                      ? "rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      : "rounded-lg border p-3 opacity-60"
                  }
                  onClick={() => {
                    if (row.plan_id) {
                      navigate(`/pdi/${row.plan_id}`);
                      setSelectedDept(null);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate max-w-[60%]">
                      {row.user_name ?? "Usuário desconhecido"}
                    </span>
                    {row.plan_status && (
                      <span className="text-xs text-muted-foreground">
                        {row.plan_status}
                      </span>
                    )}
                  </div>
                  {row.plan_title ? (
                    <>
                      <p className="text-xs text-muted-foreground truncate mb-2">
                        {row.plan_title}
                      </p>
                      <div className="flex items-center gap-2">
                        <Progress value={row.plan_progress ?? 0} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {row.plan_progress ?? 0}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem PDI ativo</p>
                  )}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
