import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Smile, Users, MessageSquare, CalendarRange } from "lucide-react";
import { useMoodHistory } from "@/hooks/useMoodHistory";
import {
  summarize, monthlySeries, byDepartment, distribution, byPerson, moodStep,
} from "@/lib/mood/moodStats";

function mesLegivel(periodo: string) {
  return format(parseISO(`${periodo}-01`), "MMM/yy", { locale: ptBR });
}

export function HRMoodTab() {
  const { data: entries, isLoading } = useMoodHistory();

  const stats = useMemo(() => {
    const lista = entries ?? [];
    return {
      resumo: summarize(lista),
      serie: monthlySeries(lista),
      departamentos: byDepartment(lista),
      distribuicao: distribution(lista),
      pessoas: byPerson(lista),
      comentarios: lista.filter((e) => e.description?.trim()).slice(0, 10),
    };
  }, [entries]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const { resumo, serie, departamentos, distribuicao, pessoas, comentarios } = stats;

  if (!resumo.total) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Smile className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>Nenhum registro de humor ainda.</p>
        </CardContent>
      </Card>
    );
  }

  const geral = moodStep(resumo.mediaGeral);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Humor médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl">{geral?.emoji}</span>
              <span className="text-2xl font-bold">{resumo.mediaGeral?.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">/ 5</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{geral?.label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo.total}</div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> {resumo.pessoas} pessoas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm font-medium">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              {resumo.periodoInicio && format(parseISO(resumo.periodoInicio), "dd/MM/yy")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              até {resumo.periodoFim && format(parseISO(resumo.periodoFim), "dd/MM/yy")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Com comentário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-2xl font-bold">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              {resumo.comComentario}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {((resumo.comComentario / resumo.total) * 100).toFixed(0)}% dos registros
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução do humor</CardTitle>
          <CardDescription>Média mensal na escala de 1 a 5</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={serie.map((p) => ({ ...p, mes: mesLegivel(p.periodo) }))}>
              <defs>
                <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="mes" className="text-xs" />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} className="text-xs" />
              {/* 3 é o ponto neutro da escala: abaixo disso o mês foi negativo. */}
              <ReferenceLine y={3} stroke="#eab308" strokeDasharray="4 4" />
              <Tooltip
                formatter={(v: number, name) => (name === "media" ? [v.toFixed(2), "Média"] : [v, "Registros"])}
                labelClassName="font-medium"
              />
              <Area type="monotone" dataKey="media" stroke="#22c55e" strokeWidth={2} fill="url(#moodFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição</CardTitle>
            <CardDescription>Quantos registros em cada nível</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {distribuicao.map((d) => (
              <div key={d.nota} className="flex items-center gap-3">
                <span className="w-6 text-lg">{d.emoji}</span>
                <span className="w-24 text-sm">{d.label}</span>
                <Progress value={d.percentual} className="h-2 flex-1" />
                <span className="w-16 text-right text-sm tabular-nums text-muted-foreground">
                  {d.quantidade} · {d.percentual}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por departamento</CardTitle>
            <CardDescription>Do menor humor para o maior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {departamentos.map((d) => {
              const step = moodStep(d.media);
              return (
                <div key={d.departamento} className="flex items-center gap-3">
                  <span className="w-6 text-lg">{step?.emoji}</span>
                  <span className="flex-1 truncate text-sm">{d.departamento}</span>
                  <Badge variant="secondary" className="tabular-nums">{d.media.toFixed(2)}</Badge>
                  <span className="w-20 text-right text-xs text-muted-foreground">
                    {d.pessoas} pess. · {d.registros}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pessoas com menor humor</CardTitle>
            <CardDescription>Ordenado pela média — quem merece atenção primeiro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pessoas.slice(0, 10).map((p) => {
              const step = moodStep(p.media);
              return (
                <div key={p.chave} className="flex items-center gap-3 border-b py-2 last:border-0">
                  <span className="w-6 text-lg">{step?.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.registros} registro{p.registros > 1 ? "s" : ""} · último em{" "}
                      {format(parseISO(p.ultimoRegistro), "dd/MM/yy")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="tabular-nums">{p.media.toFixed(2)}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comentários</CardTitle>
            <CardDescription>O que as pessoas escreveram ao registrar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {comentarios.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum registro veio com comentário.
              </p>
            )}
            {comentarios.map((c) => {
              const step = moodStep(Number(c.mood_label) || c.score);
              return (
                <div key={c.id} className="border-b pb-3 last:border-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span>{step?.emoji}</span>
                    <span className="text-sm font-medium">{c.person_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(c.recorded_at), "dd/MM/yy")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
