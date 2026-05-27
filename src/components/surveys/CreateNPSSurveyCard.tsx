import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, BarChart3, Users, Building2, UserRound } from "lucide-react";
import { MultiPersonSelector } from "@/components/objectives/MultiPersonSelector";
import { useCreateNPSSurvey } from "@/hooks/useNPSSurveys";
import { useTeams } from "@/hooks/useTeams";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_QUESTION =
  "Em uma escala de 0 a 10, o quanto você recomendaria esta empresa como um bom lugar para trabalhar?";

export function CreateNPSSurveyCard() {
  const [isEditing, setIsEditing] = useState(false);
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [targetAll, setTargetAll] = useState(true);
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [requireCommentEnabled, setRequireCommentEnabled] = useState(false);
  const [requireCommentBelow, setRequireCommentBelow] = useState<number>(6);
  const [minDaysEmployed, setMinDaysEmployed] = useState<string>("");

  const createSurvey = useCreateNPSSurvey();
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;
  
  // Fetch departments from the departments table
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
  
  // Fetch teams
  const { data: teams } = useTeams();

  const handleSubmit = async () => {
    if (!endDate) return;

    await createSurvey.mutateAsync({
      question,
      target_departments: targetAll ? [] : selectedDepartments,
      target_teams: targetAll ? [] : selectedTeams,
      target_users: targetAll ? [] : selectedUsers,
      target_all: targetAll,
      end_date: format(endDate, "yyyy-MM-dd"),
      require_comment_below: requireCommentEnabled ? requireCommentBelow : null,
      min_days_employed: minDaysEmployed ? parseInt(minDaysEmployed) : null,
    });

    // Reset form
    setQuestion(DEFAULT_QUESTION);
    setSelectedDepartments([]);
    setSelectedTeams([]);
    setSelectedUsers([]);
    setTargetAll(true);
    setEndDate(undefined);
    setRequireCommentEnabled(false);
    setRequireCommentBelow(6);
    setMinDaysEmployed("");
    setIsEditing(false);
  };

  const toggleDepartment = (deptId: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(deptId)
        ? prev.filter((id) => id !== deptId)
        : [...prev, deptId]
    );
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    );
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span>E-NPS | Employee Net Promoter Score</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Avalie os principais problemas em sua equipe e empresa
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Pergunta da pesquisa E-NPS{" "}
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-primary hover:underline ml-1"
              >
                (clique para alterar)
              </button>
            )}
          </Label>
          {isEditing ? (
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onBlur={() => setIsEditing(false)}
              autoFocus
              rows={3}
              className="bg-background"
            />
          ) : (
            <div className="p-3 rounded-lg bg-background border text-sm">
              {question}
            </div>
          )}
        </div>

        {/* Target Audience */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="targetAll"
              checked={targetAll}
              onCheckedChange={(checked) => setTargetAll(checked === true)}
            />
            <Label htmlFor="targetAll" className="font-normal cursor-pointer">
              Enviar para toda a empresa
            </Label>
          </div>

          {!targetAll && (
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Departments */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Building2 className="h-4 w-4" />
                  Áreas
                </Label>
                <div className="flex flex-wrap gap-2">
                  {departments?.map((dept) => (
                    <Button
                      key={dept.id}
                      type="button"
                      variant={
                        selectedDepartments.includes(dept.id)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => toggleDepartment(dept.id)}
                      className="text-xs"
                    >
                      {dept.name}
                    </Button>
                  ))}
                  {(!departments || departments.length === 0) && (
                    <span className="text-sm text-muted-foreground">
                      Nenhuma área cadastrado
                    </span>
                  )}
                </div>
              </div>

              {/* Teams */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Users className="h-4 w-4" />
                  Equipes
                </Label>
                <div className="flex flex-wrap gap-2">
                  {teams?.map((team) => (
                    <Button
                      key={team.id}
                      type="button"
                      variant={
                        selectedTeams.includes(team.id) ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => toggleTeam(team.id)}
                      className="text-xs"
                    >
                      {team.name}
                    </Button>
                  ))}
                  {(!teams || teams.length === 0) && (
                    <span className="text-sm text-muted-foreground">
                      Nenhum time cadastrado
                    </span>
                  )}
                </div>
              </div>

              {/* Collaborators */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <UserRound className="h-4 w-4" />
                  Colaboradores
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
                {endDate
                  ? format(endDate, "PPP", { locale: ptBR })
                  : "Selecione uma data"}
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

        {/* Require Comment */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="requireComment"
              checked={requireCommentEnabled}
              onCheckedChange={(checked) =>
                setRequireCommentEnabled(checked === true)
              }
            />
            <Label htmlFor="requireComment" className="font-normal cursor-pointer">
              Comentário obrigatório para nota abaixo de:
            </Label>
          </div>

          {requireCommentEnabled && (
            <div className="flex items-center gap-2 pl-6">
              <Select
                value={String(requireCommentBelow)}
                onValueChange={(v) => setRequireCommentBelow(parseInt(v))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                (notas de 0 até {requireCommentBelow} exigem comentário)
              </span>
            </div>
          )}
        </div>

        {/* Min Days Employed */}
        <div className="space-y-2">
          <Label className="text-sm">
            Apenas participantes com data de admissão superior a (dias)
          </Label>
          <Input
            type="number"
            placeholder="Ex: 30 (deixe vazio para todos)"
            value={minDaysEmployed}
            onChange={(e) => setMinDaysEmployed(e.target.value)}
            className="w-full sm:w-[280px]"
            min={0}
          />
          {minDaysEmployed && (
            <p className="text-xs text-muted-foreground">
              Apenas colaboradores com mais de {minDaysEmployed} dias de empresa
              poderão responder
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!endDate || createSurvey.isPending}
            className="bg-gradient-primary"
          >
            {createSurvey.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Criar Pesquisa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
