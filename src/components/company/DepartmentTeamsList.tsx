import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ExternalLink, Loader2 } from "lucide-react";
import { useDepartmentTeams } from "@/hooks/useDepartmentsManager";

interface DepartmentTeamsListProps {
  departmentId: string;
}

export function DepartmentTeamsList({ departmentId }: DepartmentTeamsListProps) {
  const { data: teams = [], isLoading } = useDepartmentTeams(departmentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum time vinculada a esta área</p>
        <p className="text-sm mt-1">
          Vincule equipes em{" "}
          <Link to="/teams" className="text-primary hover:underline">
            Gestão de Equipes
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {teams.map((team) => (
        <div
          key={team.id}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{team.name}</p>
              {team.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {team.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {team.member_count}
            </Badge>
            <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
              <Link to="/teams">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
