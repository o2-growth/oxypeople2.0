import { useMemo, useState } from "react";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePeopleList } from "@/hooks/usePeopleList";

export const SEM_GESTOR = "__none__";

interface ManagerSelectProps {
  /** user_id do gestor, ou SEM_GESTOR. */
  value: string;
  onChange: (value: string) => void;
  /** Quem está sendo editado — não pode ser gestor de si mesmo. */
  excludeUserId?: string;
  disabled?: boolean;
}

/**
 * Escolha de gestor com busca.
 *
 * São ~130 pessoas: um `<select>` comum obriga a rolar a lista inteira
 * procurando um nome. A busca por nome ou e-mail resolve em duas teclas.
 */
export function ManagerSelect({ value, onChange, excludeUserId, disabled }: ManagerSelectProps) {
  const [aberto, setAberto] = useState(false);
  const { data: pessoas = [] } = usePeopleList();

  const candidatos = useMemo(
    () =>
      pessoas
        .filter((p) => p.status === "active" && p.user_id !== excludeUserId)
        .sort((a, b) => (a.user?.full_name ?? "").localeCompare(b.user?.full_name ?? "")),
    [pessoas, excludeUserId],
  );

  const nomeDe = (id: string) =>
    candidatos.find((p) => p.user_id === id)?.user?.full_name ?? null;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            value === SEM_GESTOR && "text-muted-foreground",
          )}
        >
          <span className="truncate">
            {value === SEM_GESTOR ? "Sem gestor" : nomeDe(value) ?? "Sem gestor"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar pessoa..." />
          <CommandList>
            <CommandEmpty>Ninguém encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="sem gestor"
                onSelect={() => { onChange(SEM_GESTOR); setAberto(false); }}
              >
                <Check className={cn("mr-2 h-4 w-4", value === SEM_GESTOR ? "opacity-100" : "opacity-0")} />
                Sem gestor
              </CommandItem>
              {candidatos.map((p) => (
                <CommandItem
                  key={p.user_id}
                  value={`${p.user?.full_name ?? ""} ${p.user?.email ?? ""}`}
                  onSelect={() => { onChange(p.user_id); setAberto(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p.user_id ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1 truncate">{p.user?.full_name ?? p.user?.email}</span>
                  {p.position && (
                    <span className="ml-2 shrink-0 truncate text-xs text-muted-foreground max-w-[40%]">
                      {p.position}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
