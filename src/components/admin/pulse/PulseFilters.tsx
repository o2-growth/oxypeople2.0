import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PulseAnalyticsFilters } from "@/hooks/usePulseAnalytics";

interface PulseFiltersProps {
  value: PulseAnalyticsFilters;
  onChange: (next: PulseAnalyticsFilters) => void;
}

export function PulseFilters({ value, onChange }: PulseFiltersProps) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  const departmentsQuery = useQuery({
    queryKey: ["departments-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const teamsQuery = useQuery({
    queryKey: ["teams-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const departments = departmentsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];
  const hasFilter =
    value.departmentIds.length > 0 || value.teamIds.length > 0 || (value.periodsBack ?? 12) !== 12;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => onChange({ departmentIds: [], teamIds: [], periodsBack: 12 })}
            >
              <RotateCcw className="h-3 w-3" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Janela</Label>
          <Select
            value={String(value.periodsBack ?? 12)}
            onValueChange={(v) => onChange({ ...value, periodsBack: Number(v) })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">Últimos 4 períodos</SelectItem>
              <SelectItem value="12">Últimos 12 períodos</SelectItem>
              <SelectItem value="26">Últimos 26 períodos</SelectItem>
              <SelectItem value="52">Últimos 52 períodos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Áreas</Label>
          <div className="rounded-md border p-2 max-h-32 overflow-y-auto space-y-1">
            {departments.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma área.</p>
            )}
            {departments.map((d) => (
              <Label
                key={d.id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={value.departmentIds.includes(d.id)}
                  onCheckedChange={(checked) => {
                    onChange({
                      ...value,
                      departmentIds: checked
                        ? [...value.departmentIds, d.id]
                        : value.departmentIds.filter((id) => id !== d.id),
                    });
                  }}
                />
                {d.name}
              </Label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Times</Label>
          <div className="rounded-md border p-2 max-h-32 overflow-y-auto space-y-1">
            {teams.length === 0 && <p className="text-xs text-muted-foreground">Nenhum time.</p>}
            {teams.map((t) => (
              <Label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={value.teamIds.includes(t.id)}
                  onCheckedChange={(checked) => {
                    onChange({
                      ...value,
                      teamIds: checked
                        ? [...value.teamIds, t.id]
                        : value.teamIds.filter((id) => id !== t.id),
                    });
                  }}
                />
                {t.name}
              </Label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
