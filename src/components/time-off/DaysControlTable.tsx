import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarClock } from "lucide-react";
import {
  calcularControle, ordenarPorUrgencia, type RegistroLite,
} from "@/lib/timeOff/controleDeDias";
import type { TimeOffRecord } from "@/hooks/useTimeOff";

/** Janela do acompanhamento. Um ano é o ciclo com que o RH pensa descanso. */
const JANELA_DIAS = 365;

interface Pessoa {
  id: string;
  nome: string;
  registros: TimeOffRecord[];
}

interface DaysControlTableProps {
  pessoas: Pessoa[];
}

function fmt(d: string) {
  try {
    return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return d;
  }
}

/**
 * Controle de dias de suspensão de contrato.
 *
 * Não existe teto de dias na O2, então a tabela não mostra saldo — mostra quem
 * está há mais tempo sem se afastar, que é a pergunta que o RH faz e que o
 * histórico por data não responde.
 */
export function DaysControlTable({ pessoas }: DaysControlTableProps) {
  const linhas = useMemo(() => {
    const hoje = new Date();
    return ordenarPorUrgencia(
      pessoas.map((p) => ({
        id: p.id,
        nome: p.nome,
        controle: calcularControle(
          p.registros.map(
            (r): RegistroLite => ({
              start_date: r.start_date,
              end_date: r.end_date,
              days: r.days,
              status: r.status,
            }),
          ),
          JANELA_DIAS,
          hoje,
        ),
      })),
    );
  }, [pessoas]);

  if (linhas.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nenhuma pessoa ativa."
        description="O controle acompanha apenas quem está na casa."
      />
    );
  }

  const totalDias = linhas.reduce((acc, l) => acc + l.controle.diasNaJanela, 0);
  const nunca = linhas.filter((l) => l.controle.diasSemAfastar === null).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-6 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <div>
          <span className="text-muted-foreground">Pessoas acompanhadas</span>
          <p className="font-semibold">{linhas.length}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Dias nos últimos 12 meses</span>
          <p className="font-semibold">{totalDias}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Nunca se afastaram</span>
          <p className="font-semibold">{nunca}</p>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Pessoa</TableHead>
              <TableHead className="text-right">Dias (12 meses)</TableHead>
              <TableHead className="text-right">Dias no total</TableHead>
              <TableHead>Último afastamento</TableHead>
              <TableHead className="text-right">Sem se afastar</TableHead>
              <TableHead>Próximo agendado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium text-sm">{l.nome}</TableCell>
                <TableCell className="text-right text-sm">
                  {l.controle.diasNaJanela}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {l.controle.diasNoTotal}
                </TableCell>
                <TableCell className="text-sm">
                  {l.controle.ultimoAfastamento ? (
                    fmt(l.controle.ultimoAfastamento)
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-warning/10 text-warning border-warning/20"
                    >
                      nunca
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {l.controle.diasSemAfastar === null
                    ? "—"
                    : `${l.controle.diasSemAfastar} dias`}
                </TableCell>
                <TableCell className="text-sm">
                  {l.controle.proximoAgendado ? (
                    <Badge
                      variant="outline"
                      className="bg-accent/10 text-accent border-accent/20"
                    >
                      {fmt(l.controle.proximoAgendado)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
