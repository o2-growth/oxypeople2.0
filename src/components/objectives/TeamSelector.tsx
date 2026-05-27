import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";

interface Team {
  id: string;
  name: string;
  department: string | null;
}

interface TeamSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function TeamSelector({
  value,
  onValueChange,
  placeholder = "Selecione uma equipe",
}: TeamSelectorProps) {
  const { profile } = useUser();
  const { isAdmin, ledTeamIds } = useUserPermissions();
  const companyId = profile?.primary_company_id;

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams-for-selector", companyId, isAdmin, ledTeamIds],
    queryFn: async (): Promise<Team[]> => {
      if (!companyId) return [];

      let query = supabase
        .from("teams")
        .select("id, name, department")
        .eq("company_id", companyId)
        .order("name");

      // If not admin, filter to only led teams
      if (!isAdmin && ledTeamIds.length > 0) {
        query = query.in("id", ledTeamIds);
      } else if (!isAdmin && ledTeamIds.length === 0) {
        return [];
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching teams:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Carregando equipes..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Nenhum time disponível" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{team.name}</span>
              {team.department && (
                <span className="text-xs text-muted-foreground">
                  ({team.department})
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
