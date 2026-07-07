import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PulseEnpsProps {
  selected: number | null;
  onSelect: (value: number) => void;
  disabled?: boolean;
}

export function PulseEnps({ selected, onSelect, disabled }: PulseEnpsProps) {
  // Escala 0–10 neutra: sem legenda de faixas e sem cores por classificação
  // (detrator/passivo/promotor) para não enviesar a resposta.
  return (
    <div className="grid grid-cols-11 gap-1">
      {Array.from({ length: 11 }, (_, i) => i).map((n) => {
        const active = selected === n;
        return (
          <Button
            key={n}
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onSelect(n)}
            className={cn(
              "h-10 text-sm font-semibold transition-all bg-muted text-foreground hover:bg-muted/70",
              active && "scale-110 bg-primary/15 text-primary ring-2 ring-primary",
            )}
          >
            {n}
          </Button>
        );
      })}
    </div>
  );
}
