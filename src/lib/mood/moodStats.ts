/**
 * Agregações do histórico de humor.
 *
 * A origem (Feedz) usava escala 1–5. `score` é a média da pessoa no momento do
 * registro e vem fracionário; `mood_label` é o humor cru daquele dia e vem como
 * número em texto ("4", "5"), não como rótulo — por isso a tradução acontece
 * aqui e não na importação.
 */

export interface MoodEntry {
  id: string;
  user_id: string | null;
  person_name: string;
  score: number | null;
  mood_label: string | null;
  description: string | null;
  department: string | null;
  recorded_at: string;
}

export const MOOD_SCALE: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: "Muito ruim", emoji: "😞", color: "#ef4444" },
  2: { label: "Ruim", emoji: "🙁", color: "#f97316" },
  3: { label: "Neutro", emoji: "😐", color: "#eab308" },
  4: { label: "Bom", emoji: "🙂", color: "#84cc16" },
  5: { label: "Ótimo", emoji: "😄", color: "#22c55e" },
};

/** Converte nota (inteira ou fracionária) no degrau mais próximo da escala. */
export function moodStep(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return null;
  const step = Math.min(5, Math.max(1, Math.round(value)));
  return MOOD_SCALE[step];
}

function media(valores: number[]): number | null {
  if (!valores.length) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/** Nota efetiva do registro: prefere o humor do dia; cai para a média. */
function notaDoRegistro(e: MoodEntry): number | null {
  const bruto = e.mood_label != null && e.mood_label !== "" ? Number(e.mood_label) : NaN;
  if (!Number.isNaN(bruto)) return bruto;
  return e.score ?? null;
}

export interface MoodSummary {
  total: number;
  pessoas: number;
  mediaGeral: number | null;
  periodoInicio: string | null;
  periodoFim: string | null;
  comComentario: number;
}

export function summarize(entries: MoodEntry[]): MoodSummary {
  const notas = entries.map(notaDoRegistro).filter((n): n is number => n != null);
  const datas = entries.map((e) => e.recorded_at).sort();
  return {
    total: entries.length,
    pessoas: new Set(entries.map((e) => e.user_id ?? e.person_name)).size,
    mediaGeral: media(notas),
    periodoInicio: datas[0]?.slice(0, 10) ?? null,
    periodoFim: datas[datas.length - 1]?.slice(0, 10) ?? null,
    comComentario: entries.filter((e) => e.description?.trim()).length,
  };
}

export interface MoodPoint {
  periodo: string;     // AAAA-MM
  media: number;
  registros: number;
}

/** Série mensal, em ordem cronológica. */
export function monthlySeries(entries: MoodEntry[]): MoodPoint[] {
  const buckets = new Map<string, number[]>();
  for (const e of entries) {
    const nota = notaDoRegistro(e);
    if (nota == null) continue;
    const periodo = e.recorded_at.slice(0, 7);
    if (!buckets.has(periodo)) buckets.set(periodo, []);
    buckets.get(periodo)!.push(nota);
  }
  return [...buckets.entries()]
    .map(([periodo, notas]) => ({
      periodo,
      media: Number(media(notas)!.toFixed(2)),
      registros: notas.length,
    }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
}

export interface MoodByDepartment {
  departamento: string;
  media: number;
  registros: number;
  pessoas: number;
}

/** Média por departamento, da menor para a maior — o que precisa de atenção primeiro. */
export function byDepartment(entries: MoodEntry[]): MoodByDepartment[] {
  const buckets = new Map<string, { notas: number[]; pessoas: Set<string> }>();
  for (const e of entries) {
    const nota = notaDoRegistro(e);
    if (nota == null) continue;
    const dep = e.department?.trim() || "Sem departamento";
    if (!buckets.has(dep)) buckets.set(dep, { notas: [], pessoas: new Set() });
    const b = buckets.get(dep)!;
    b.notas.push(nota);
    b.pessoas.add(e.user_id ?? e.person_name);
  }
  return [...buckets.entries()]
    .map(([departamento, b]) => ({
      departamento,
      media: Number(media(b.notas)!.toFixed(2)),
      registros: b.notas.length,
      pessoas: b.pessoas.size,
    }))
    .sort((a, b) => a.media - b.media);
}

export interface MoodDistribution {
  nota: number;
  label: string;
  emoji: string;
  color: string;
  quantidade: number;
  percentual: number;
}

/** Distribuição pelos 5 degraus, sempre com os cinco presentes. */
export function distribution(entries: MoodEntry[]): MoodDistribution[] {
  const contagem = new Map<number, number>();
  let total = 0;
  for (const e of entries) {
    const nota = notaDoRegistro(e);
    if (nota == null) continue;
    const step = Math.min(5, Math.max(1, Math.round(nota)));
    contagem.set(step, (contagem.get(step) ?? 0) + 1);
    total++;
  }
  return [1, 2, 3, 4, 5].map((nota) => {
    const quantidade = contagem.get(nota) ?? 0;
    return {
      nota,
      ...MOOD_SCALE[nota],
      quantidade,
      percentual: total ? Number(((quantidade / total) * 100).toFixed(1)) : 0,
    };
  });
}

export interface MoodPerson {
  chave: string;
  nome: string;
  userId: string | null;
  media: number;
  registros: number;
  ultimoRegistro: string;
  ultimaNota: number;
}

/** Uma linha por pessoa, da menor média para a maior. */
export function byPerson(entries: MoodEntry[]): MoodPerson[] {
  const buckets = new Map<string, MoodEntry[]>();
  for (const e of entries) {
    const chave = e.user_id ?? e.person_name;
    if (!buckets.has(chave)) buckets.set(chave, []);
    buckets.get(chave)!.push(e);
  }
  const out: MoodPerson[] = [];
  for (const [chave, lista] of buckets) {
    const notas = lista.map(notaDoRegistro).filter((n): n is number => n != null);
    if (!notas.length) continue;
    const ordenado = [...lista].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
    out.push({
      chave,
      nome: ordenado[0].person_name,
      userId: ordenado[0].user_id,
      media: Number(media(notas)!.toFixed(2)),
      registros: lista.length,
      ultimoRegistro: ordenado[0].recorded_at,
      ultimaNota: notaDoRegistro(ordenado[0]) ?? 0,
    });
  }
  return out.sort((a, b) => a.media - b.media);
}
