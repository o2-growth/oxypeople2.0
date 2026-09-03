import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useUserPermissions } from "@/hooks/useUserPermissions";
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
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Person {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  department?: string | null;
}

interface PersonSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  excludeCurrentUser?: boolean;
}

export function PersonSelector({
  value,
  onValueChange,
  placeholder = "Selecione uma pessoa",
  excludeCurrentUser = false,
}: PersonSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { profile } = useUser();
  const { isAdmin, ledPeopleIds } = useUserPermissions();
  const companyId = profile?.primary_company_id;

  const { data: people, isLoading } = useQuery({
    queryKey: ["people-for-selector", companyId, isAdmin, ledPeopleIds],
    queryFn: async (): Promise<Person[]> => {
      if (!companyId) return [];

      if (isAdmin) {
        // Admin can see all company members
        const { data, error } = await supabase
          .from("company_memberships")
          .select(`
            user_id,
            department,
            users:user_id(id, full_name, email, avatar_url)
          `)
          .eq("company_id", companyId)
          .eq("status", "active");

        if (error) {
          console.error("Error fetching users:", error);
          return [];
        }

        return (data || []).map((m: any) => ({
          id: m.users.id,
          full_name: m.users.full_name,
          email: m.users.email,
          avatar_url: m.users.avatar_url,
          department: m.department,
        }));
      } else if (ledPeopleIds.length > 0) {
        // Quem lidera vê quem lidera — pela regra única, não só pelos times.
        // Buscar por team_members trazia desligado junto: o vínculo de time
        // sobrevive ao desligamento, e o gestor sem time não via ninguém.
        const { data, error } = await supabase
          .from("company_memberships")
          .select(`
            user_id,
            department,
            users:user_id(id, full_name, email, avatar_url)
          `)
          .eq("company_id", companyId)
          .eq("status", "active")
          .in("user_id", ledPeopleIds);

        if (error) {
          console.error("Error fetching led people:", error);
          return [];
        }

        return (data || []).map((m: any) => ({
          id: m.users.id,
          full_name: m.users.full_name,
          email: m.users.email,
          avatar_url: m.users.avatar_url,
          department: m.department,
        }));
      }

      return [];
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
      if (excludeCurrentUser && p.id === profile?.id) return false;
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        p.full_name?.toLowerCase().includes(searchLower) ||
        p.email.toLowerCase().includes(searchLower)
      );
    })
    .slice(0, 20);

  const selectedPerson = people?.find((p) => p.id === value);

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedPerson ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedPerson.avatar_url || ""} />
                <AvatarFallback className="text-xs">
                  {getInitials(selectedPerson.full_name, selectedPerson.email)}
                </AvatarFallback>
              </Avatar>
              <span>{selectedPerson.full_name || selectedPerson.email}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
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
                  onSelect={() => {
                    onValueChange(person.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === person.id ? "opacity-100" : "opacity-0"
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
  );
}
