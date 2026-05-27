import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Award, Users, Building2, UserRound } from "lucide-react";
import { MultiPersonSelector } from "@/components/objectives/MultiPersonSelector";
import { useCreateGPTWSurvey } from "@/hooks/useGPTWSurveys";
import { useTeams } from "@/hooks/useTeams";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useQuery } from "@tanstack/react-query";

export function CreateGPTWSurveyCard() {
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [targetAll, setTargetAll] = useState(true);
  const [endDate, setEndDate] = useState<Date | undefined>();

  const createSurvey = useCreateGPTWSurvey();
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  const { data: departments } = useQuery({
    queryKey: ["departments-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: teams } = useTeams();

  const handleSubmit = async () => {
    if (!endDate) return;
    await createSurvey.mutateAsync({
      target_departments: targetAll ? [] : selectedDepartments,
      target_teams: targetAll ? [] : selectedTeams,
      target_users: targetAll ? [] : selectedUsers,
      target_all: targetAll,
      end_date: format(endDate, "yyyy-MM-dd"),
    });
    setSelectedDepartments([]);
    setSelectedTeams([]);
    setSelectedUsers([]);
    setTargetAll(true);
    setEndDate(undefined);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <span>GPTW | Pesquisa de Clima</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Questionário Trust Index© com 29 afirmativas + eNPS
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Target Audience */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="gptwTargetAll"
              checked={targetAll}
              onCheckedChange={(checked) => setTargetAll(checked === true)}
            />
            <Label htmlFor="gptwTargetAll" className="font-normal cursor-pointer">
              Enviar para toda a empresa
            </Label>
          </div>

          {!targetAll && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Building2 className="h-4 w-4" /> Áreas
                </Label>
                <div className="flex flex-wrap gap-2">
                  {departments?.map((dept) => (
                    <Button
                      key={dept.id}
                      type="button"
                      variant={selectedDepartments.includes(dept.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setSelectedDepartments((prev) =>
                          prev.includes(dept.id) ? prev.filter((id) => id !== dept.id) : [...prev, dept.id]
                        )
                      }
                      className="text-xs"
                    >
                      {dept.name}
                    </Button>
                  ))}
                  {(!departments || departments.length === 0) && (
                    <span className="text-sm text-muted-foreground">Nenhuma área</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Users className="h-4 w-4" /> Equipes
                </Label>
                <div className="flex flex-wrap gap-2">
                  {teams?.map((team) => (
                    <Button
                      key={team.id}
                      type="button"
                      variant={selectedTeams.includes(team.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setSelectedTeams((prev) =>
                          prev.includes(team.id) ? prev.filter((id) => id !== team.id) : [...prev, team.id]
                        )
                      }
                      className="text-xs"
                    >
                      {team.name}
                    </Button>
                  ))}
                  {(!teams || teams.length === 0) && (
                    <span className="text-sm text-muted-foreground">Nenhum time</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <UserRound className="h-4 w-4" /> Colaboradores
                </Label>
                <MultiPersonSelector
                  value={selectedUsers}
                  onValueChange={setSelectedUsers}
                  placeholder="Selecione colaboradores"
                  filterByDepartmentIds={selectedDepartments}
                  filterByTeamIds={selectedTeams}
                />
              </div>
            </div>
          )}
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label className="text-sm">Data de Encerramento</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[280px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                disabled={(date) => date < new Date()}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!endDate || createSurvey.isPending}
            className="bg-gradient-primary"
          >
            {createSurvey.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Pesquisa GPTW
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
