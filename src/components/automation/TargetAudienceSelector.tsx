import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, UsersRound, Globe } from "lucide-react";

export type AudienceType = "all" | "department" | "team";

export interface TargetAudience {
  type: AudienceType;
  departmentIds?: string[];
  teamIds?: string[];
}

interface TargetAudienceSelectorProps {
  value: TargetAudience;
  onChange: (value: TargetAudience) => void;
}

export function TargetAudienceSelector({
  value,
  onChange,
}: TargetAudienceSelectorProps) {
  const { profile } = useUser();

  // Buscar áreas únicos dos membros da empresa
  const { data: departments } = useQuery({
    queryKey: ["departments", profile?.primary_company_id],
    queryFn: async () => {
      if (!profile?.primary_company_id) return [];

      const { data, error } = await supabase
        .from("company_memberships")
        .select("department")
        .eq("company_id", profile.primary_company_id)
        .eq("status", "active")
        .not("department", "is", null);

      if (error) throw error;

      // Extrair áreas únicos
      const uniqueDepts = [...new Set(data.map((d) => d.department))].filter(
        Boolean
      ) as string[];
      return uniqueDepts.sort();
    },
    enabled: !!profile?.primary_company_id,
  });

  // Buscar equipes da empresa
  const { data: teams } = useQuery({
    queryKey: ["teams", profile?.primary_company_id],
    queryFn: async () => {
      if (!profile?.primary_company_id) return [];

      const { data, error } = await supabase
        .from("teams")
        .select("id, name, department")
        .eq("company_id", profile.primary_company_id)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.primary_company_id,
  });

  const handleTypeChange = (type: AudienceType) => {
    onChange({
      type,
      departmentIds: type === "department" ? [] : undefined,
      teamIds: type === "team" ? [] : undefined,
    });
  };

  const handleDepartmentChange = (dept: string) => {
    const currentDepts = value.departmentIds || [];
    const newDepts = currentDepts.includes(dept)
      ? currentDepts.filter((d) => d !== dept)
      : [...currentDepts, dept];
    onChange({ ...value, departmentIds: newDepts });
  };

  const handleTeamChange = (teamId: string) => {
    const currentTeams = value.teamIds || [];
    const newTeams = currentTeams.includes(teamId)
      ? currentTeams.filter((t) => t !== teamId)
      : [...currentTeams, teamId];
    onChange({ ...value, teamIds: newTeams });
  };

  return (
    <div className="space-y-4">
      <Label>Público-alvo</Label>

      <RadioGroup
        value={value.type}
        onValueChange={(v) => handleTypeChange(v as AudienceType)}
        className="grid grid-cols-3 gap-3"
      >
        <label
          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
            value.type === "all"
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/30"
          }`}
        >
          <RadioGroupItem value="all" className="sr-only" />
          <Globe className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Geral</span>
          <span className="text-xs text-muted-foreground text-center">
            Todos da empresa
          </span>
        </label>

        <label
          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
            value.type === "department"
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/30"
          }`}
        >
          <RadioGroupItem value="department" className="sr-only" />
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Área</span>
          <span className="text-xs text-muted-foreground text-center">
            Por área
          </span>
        </label>

        <label
          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
            value.type === "team"
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/30"
          }`}
        >
          <RadioGroupItem value="team" className="sr-only" />
          <UsersRound className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Time</span>
          <span className="text-xs text-muted-foreground text-center">
            Time específico
          </span>
        </label>
      </RadioGroup>

      {/* Seletor de Áreas */}
      {value.type === "department" && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Selecione as áreas
          </Label>
          {departments && departments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <Badge
                  key={dept}
                  variant={
                    value.departmentIds?.includes(dept) ? "default" : "outline"
                  }
                  className="cursor-pointer transition-colors"
                  onClick={() => handleDepartmentChange(dept)}
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  {dept}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma área cadastrado. Configure áreas nos perfis
              dos colaboradores.
            </p>
          )}
        </div>
      )}

      {/* Seletor de Equipes */}
      {value.type === "team" && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Selecione as equipes
          </Label>
          {teams && teams.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {teams.map((team) => (
                <Badge
                  key={team.id}
                  variant={
                    value.teamIds?.includes(team.id) ? "default" : "outline"
                  }
                  className="cursor-pointer transition-colors"
                  onClick={() => handleTeamChange(team.id)}
                >
                  <UsersRound className="h-3 w-3 mr-1" />
                  {team.name}
                  {team.department && (
                    <span className="text-xs opacity-70 ml-1">
                      ({team.department})
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum time cadastrado. Crie times na seção de gestão de
              pessoas.
            </p>
          )}
        </div>
      )}

      {/* Resumo da seleção */}
      {value.type !== "all" && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Users className="h-3 w-3" />
          {value.type === "department" && value.departmentIds?.length
            ? `${value.departmentIds.length} área(s) selecionado(s)`
            : value.type === "team" && value.teamIds?.length
            ? `${value.teamIds.length} time(s) selecionada(s)`
            : "Nenhuma seleção"}
        </div>
      )}
    </div>
  );
}
