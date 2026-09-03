import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Person {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface MultiPersonSelectorProps {
  value: string[];
  onValueChange: (ids: string[]) => void;
  placeholder?: string;
  excludeIds?: string[];
  filterByDepartmentIds?: string[];
  filterByTeamIds?: string[];
}

export function MultiPersonSelector({
  value,
  onValueChange,
  placeholder = "Selecione pessoas",
  excludeIds = [],
  filterByDepartmentIds = [],
  filterByTeamIds = [],
}: MultiPersonSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  const hasFilters = filterByDepartmentIds.length > 0 || filterByTeamIds.length > 0;

  const { data: people, isLoading } = useQuery({
    queryKey: ["people-multi-selector", companyId, filterByDepartmentIds, filterByTeamIds],
    queryFn: async (): Promise<Person[]> => {
      if (!companyId) return [];

      // If we have department/team filters, fetch filtered users
      if (hasFilters) {
        const userIdSet = new Set<string>();
        const usersMap = new Map<string, Person>();

        // Fetch users from selected departments
        if (filterByDepartmentIds.length > 0) {
          const { data: deptMembers } = await supabase
            .from("company_memberships")
            .select(`
              user_id,
              users:user_id(id, full_name, email, avatar_url)
            `)
            .eq("company_id", companyId)
            .eq("status", "active")
            .in("department_id", filterByDepartmentIds);

          (deptMembers || []).forEach((m: any) => {
            if (m.users) {
              userIdSet.add(m.users.id);
              usersMap.set(m.users.id, {
                id: m.users.id,
                full_name: m.users.full_name,
                email: m.users.email,
                avatar_url: m.users.avatar_url,
              });
            }
          });
        }

        // Fetch users from selected teams
        if (filterByTeamIds.length > 0) {
          const { data: teamMembers } = await supabase
            .from("team_members")
            .select("user_id")
            .in("team_id", filterByTeamIds);

          const idsDoTime = (teamMembers || []).map((m: any) => m.user_id);

          // O vínculo de time não guarda status e ninguém o limpa no
          // desligamento: buscar direto em team_members trazia gente que já
          // saiu. A membership ativa é o que diz quem ainda está na casa.
          if (idsDoTime.length > 0) {
            const { data: ativos } = await supabase
              .from("company_memberships")
              .select(`
                user_id,
                users:user_id(id, full_name, email, avatar_url)
              `)
              .eq("company_id", companyId)
              .eq("status", "active")
              .in("user_id", idsDoTime);

            (ativos || []).forEach((m: any) => {
              if (m.users) {
                userIdSet.add(m.users.id);
                usersMap.set(m.users.id, {
                  id: m.users.id,
                  full_name: m.users.full_name,
                  email: m.users.email,
                  avatar_url: m.users.avatar_url,
                });
              }
            });
          }
        }

        return Array.from(usersMap.values());
      }

      // No filters: fetch all company members
      const { data, error } = await supabase
        .from("company_memberships")
        .select(`
          user_id,
          users:user_id(id, full_name, email, avatar_url)
        `)
        .eq("company_id", companyId)
        .eq("status", "active");

      if (error) {
        console.error("Error fetching users:", error);
        return [];
      }

      return (data || [])
        .filter((m: any) => m.users !== null)
        .map((m: any) => ({
          id: m.users.id,
          full_name: m.users.full_name,
          email: m.users.email,
          avatar_url: m.users.avatar_url,
        }));
    },
    enabled: !!companyId,
  });

  const filteredPeople = (people || [])
    .slice()
    .sort((a, b) =>
      (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email, "pt-BR", {
        sensitivity: "base",
      }),
    )
    .filter((p) => {
      if (excludeIds.includes(p.id)) return false;
      if (value.includes(p.id)) return false;
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        p.full_name?.toLowerCase().includes(searchLower) ||
        p.email.toLowerCase().includes(searchLower)
      );
    })
    .slice(0, 20);

  const selectedPeople = (people || []).filter((p) => value.includes(p.id));

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  const handleSelect = (personId: string) => {
    if (!value.includes(personId)) {
      onValueChange([...value, personId]);
    }
    setSearch("");
  };

  const handleRemove = (personId: string) => {
    onValueChange(value.filter((id) => id !== personId));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="text-muted-foreground">{placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar pessoa..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Carregando..." : "Nenhuma pessoa encontrada."}
              </CommandEmpty>
              <CommandGroup>
                {filteredPeople.map((person) => (
                  <CommandItem
                    key={person.id}
                    value={person.id}
                    onSelect={() => handleSelect(person.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(person.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={person.avatar_url || ""} />
                      <AvatarFallback className="text-xs">
                        {getInitials(person.full_name, person.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {person.full_name || person.email}
                      </span>
                      {person.full_name && (
                        <span className="text-xs text-muted-foreground">
                          {person.email}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedPeople.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedPeople.map((person) => (
            <Badge
              key={person.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={person.avatar_url || ""} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(person.full_name, person.email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">
                {person.full_name?.split(" ")[0] || person.email.split("@")[0]}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(person.id)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
