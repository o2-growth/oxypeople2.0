/**
 * As ferramentas do MCP do OxyPeople — leitura, em linguagem de negócio.
 *
 * Toda consulta roda com o client autenticado do PRÓPRIO usuário, então a RLS
 * decide o que ele vê. Nenhuma regra de visibilidade é reimplementada aqui: a
 * de `objectives` tem sete ramos e reescrevê-la seria a forma mais provável de
 * vazar OKR de uma área para outra.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import {
  krProgress, krIsMet, krIsMeasured, krMode, formatKrValue,
} from "../_shared/kr-progress.ts";

const KR_CAMPOS =
  "id, title, kr_type, direction, initial_value, target_value, current_value, unit, last_checkin_at, confidence, owner_user_id";

interface KrLinha {
  id: string; title: string; kr_type: string | null; direction: string | null;
  initial_value: number; target_value: number; current_value: number;
  unit: string | null; last_checkin_at: string | null; confidence: string | null;
}

/** O KR traduzido para o que uma pessoa perguntaria — não para colunas. */
function descreverKr(kr: KrLinha) {
  const teto = krMode(kr) === "ceiling";
  const medido = krIsMeasured(kr);
  const pct = krProgress(kr);
  return {
    titulo: kr.title,
    valor_atual: medido ? formatKrValue(kr.current_value, kr.kr_type, kr.unit) : null,
    [teto ? "teto" : "meta"]: formatKrValue(kr.target_value, kr.kr_type, kr.unit),
    progresso_pct: pct,
    situacao: !medido
      ? "sem medição"
      : krIsMet(kr)
        ? (teto ? "dentro do teto" : "meta batida")
        : (teto ? "acima do teto" : "em andamento"),
    tipo_de_meta: teto ? "teto (quanto menor, melhor)" : krMode(kr) === "down" ? "redução" : "subida",
    ultimo_checkin: kr.last_checkin_at,
    dias_sem_checkin: kr.last_checkin_at
      ? Math.floor((Date.now() - new Date(kr.last_checkin_at).getTime()) / 86_400_000)
      : null,
  };
}

const objetivoComKrs = (o: { id: string; title: string; progress: number | null; status: string; type: string; key_results?: KrLinha[] }) => ({
  objetivo: o.title,
  tipo: o.type,
  status: o.status,
  progresso_pct: o.progress ?? 0,
  key_results: (o.key_results ?? []).map(descreverKr),
});

export const TOOLS = [
  {
    name: "meus_okrs",
    description:
      "Os objetivos da pessoa que está perguntando: os que ela é dona, de quem ela é responsável ou do time dela, com o progresso de cada key result. Use para 'como estão meus OKRs', 'meus objetivos', 'como está minha área'.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "okrs_da_empresa",
    description:
      "Todos os objetivos visíveis da empresa no período corrente, com progresso por objetivo e por área. Use para 'como está a empresa', 'panorama dos OKRs', 'progresso por área'.",
    inputSchema: {
      type: "object",
      properties: { area: { type: "string", description: "Filtra por nome de time ou departamento." } },
      additionalProperties: false,
    },
  },
  {
    name: "krs_em_risco",
    description:
      "Key results que precisam de atenção: acima do teto, sem medição, ou parados há mais de uma semana sem check-in. Use para 'o que está em risco', 'o que não está indo bem', 'o que estourou a meta'.",
    inputSchema: {
      type: "object",
      properties: { dias_sem_checkin: { type: "number", description: "Padrão 7." } },
      additionalProperties: false,
    },
  },
  {
    name: "status_metrica",
    description:
      "Situação de uma métrica específica (CAC, CPMQL, churn, no-show, speed-to-lead…): onde está, qual o limite e se está dentro. Use para 'o CAC está dentro?', 'como está o churn?'.",
    inputSchema: {
      type: "object",
      properties: { metrica: { type: "string", description: "Nome ou apelido, ex.: CAC, CPMQL, churn." } },
      required: ["metrica"],
      additionalProperties: false,
    },
  },
  {
    name: "checkins_pendentes",
    description:
      "Quem ainda não reportou: key results sem check-in no prazo, com o responsável de cada um. Use para 'quem não fez check-in', 'quem está devendo atualização'.",
    inputSchema: {
      type: "object",
      properties: { dias: { type: "number", description: "Padrão 7." } },
      additionalProperties: false,
    },
  },
  {
    name: "historico_kr",
    description:
      "A série de check-ins de um key result: como o número evoluiu e o que foi comentado. Use para 'o CPMQL melhorou?', 'histórico desse KR'.",
    inputSchema: {
      type: "object",
      properties: { busca: { type: "string", description: "Parte do título do KR." } },
      required: ["busca"],
      additionalProperties: false,
    },
  },
] as const;

export async function executarTool(
  db: SupabaseClient,
  userId: string,
  nome: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (nome) {
    case "meus_okrs": {
      const { data, error } = await db
        .from("objectives")
        .select(`id, title, type, status, progress, key_results(${KR_CAMPOS})`)
        .is("deleted_at", null)
        // O embed não herda o filtro do pai: sem esta linha, KR excluído volta
        // a aparecer nas respostas do MCP.
        .is("key_results.deleted_at", null)
        .eq("is_active", true)
        .or(`owner_id.eq.${userId},assignee_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return {
        total: data?.length ?? 0,
        objetivos: (data ?? []).map(objetivoComKrs),
      };
    }

    case "okrs_da_empresa": {
      const { data, error } = await db
        .from("objectives")
        .select(`id, title, type, status, progress, department, team:teams(name), key_results(${KR_CAMPOS})`)
        .is("deleted_at", null)
        // O embed não herda o filtro do pai: sem esta linha, KR excluído volta
        // a aparecer nas respostas do MCP.
        .is("key_results.deleted_at", null)
        .eq("is_active", true)
        .order("type")
        .limit(100);
      if (error) throw error;
      const area = (args.area as string | undefined)?.toLowerCase();
      const filtrados = (data ?? []).filter((o) => {
        if (!area) return true;
        const nome = `${(o as { team?: { name?: string } }).team?.name ?? ""} ${o.department ?? ""} ${o.title}`;
        return nome.toLowerCase().includes(area);
      });
      return {
        total: filtrados.length,
        objetivos: filtrados.map((o) => ({
          ...objetivoComKrs(o),
          area: (o as { team?: { name?: string } }).team?.name ?? o.department ?? null,
        })),
      };
    }

    case "krs_em_risco": {
      const limite = Number(args.dias_sem_checkin ?? 7);
      const { data, error } = await db
        .from("objectives")
        .select(`title, team:teams(name), key_results(${KR_CAMPOS})`)
        .is("deleted_at", null)
        // O embed não herda o filtro do pai: sem esta linha, KR excluído volta
        // a aparecer nas respostas do MCP.
        .is("key_results.deleted_at", null)
        .eq("is_active", true)
        .limit(100);
      if (error) throw error;

      const riscos: unknown[] = [];
      for (const o of data ?? []) {
        for (const kr of ((o.key_results ?? []) as KrLinha[])) {
          const d = descreverKr(kr);
          const motivos: string[] = [];
          if (d.situacao === "acima do teto") motivos.push("estourou o teto");
          if (d.situacao === "sem medição") motivos.push("nunca foi medido");
          if ((d.dias_sem_checkin ?? 999) > limite) motivos.push(`${d.dias_sem_checkin ?? "?"} dias sem check-in`);
          if (motivos.length) {
            riscos.push({ ...d, objetivo: o.title, area: (o as { team?: { name?: string } }).team?.name ?? null, motivos });
          }
        }
      }
      return { total: riscos.length, krs: riscos };
    }

    case "status_metrica": {
      const busca = String(args.metrica ?? "").trim();
      // O catálogo traduz o apelido que a pessoa usou para os títulos reais.
      const { data: metricas } = await db
        .from("metric_catalog")
        .select("key, label, aliases, unit, typical_min, typical_max, definition");
      const catalogo = (metricas ?? []).find((m) =>
        [m.key, m.label, ...(m.aliases ?? [])].some((a: string) =>
          a.toLowerCase().includes(busca.toLowerCase()) || busca.toLowerCase().includes(a.toLowerCase()),
        ),
      );

      const termos = catalogo ? [catalogo.label, ...(catalogo.aliases ?? [])] : [busca];
      const { data, error } = await db
        .from("objectives")
        .select(`title, team:teams(name), key_results(${KR_CAMPOS})`)
        .is("deleted_at", null)
        // O embed não herda o filtro do pai: sem esta linha, KR excluído volta
        // a aparecer nas respostas do MCP.
        .is("key_results.deleted_at", null)
        .eq("is_active", true)
        .limit(100);
      if (error) throw error;

      const achados: unknown[] = [];
      for (const o of data ?? []) {
        for (const kr of ((o.key_results ?? []) as KrLinha[])) {
          const t = kr.title.toLowerCase();
          if (termos.some((x) => t.includes(String(x).toLowerCase()))) {
            achados.push({ ...descreverKr(kr), objetivo: o.title, area: (o as { team?: { name?: string } }).team?.name ?? null });
          }
        }
      }
      return {
        metrica: catalogo?.label ?? busca,
        definicao: catalogo?.definition ?? null,
        faixa_tipica: catalogo ? `${catalogo.typical_min} a ${catalogo.typical_max} ${catalogo.unit ?? ""}`.trim() : null,
        encontrados: achados.length,
        key_results: achados,
      };
    }

    case "checkins_pendentes": {
      const dias = Number(args.dias ?? 7);
      const { data, error } = await db
        .from("objectives")
        .select(`title, key_results(${KR_CAMPOS}, owner:users!key_results_owner_user_id_fkey(full_name))`)
        .is("deleted_at", null)
        // O embed não herda o filtro do pai: sem esta linha, KR excluído volta
        // a aparecer nas respostas do MCP.
        .is("key_results.deleted_at", null)
        .eq("is_active", true)
        .limit(100);
      if (error) throw error;

      const pendentes: unknown[] = [];
      for (const o of data ?? []) {
        for (const kr of ((o.key_results ?? []) as (KrLinha & { owner?: { full_name?: string } })[])) {
          const d = descreverKr(kr);
          if ((d.dias_sem_checkin ?? 999) > dias) {
            pendentes.push({
              key_result: kr.title,
              objetivo: o.title,
              responsavel: kr.owner?.full_name ?? "sem responsável",
              dias_sem_checkin: d.dias_sem_checkin,
              ultimo_checkin: d.ultimo_checkin,
            });
          }
        }
      }
      pendentes.sort((a, b) => ((b as { dias_sem_checkin: number }).dias_sem_checkin ?? 0) - ((a as { dias_sem_checkin: number }).dias_sem_checkin ?? 0));
      return { total: pendentes.length, pendentes };
    }

    case "historico_kr": {
      const busca = String(args.busca ?? "").trim();
      const { data: krs, error } = await db
        .from("key_results")
        .select(`${KR_CAMPOS}, objective:objectives(title)`)
        .ilike("title", `%${busca}%`)
        .is("deleted_at", null)
        .limit(5);
      if (error) throw error;
      if (!krs?.length) return { encontrados: 0, mensagem: `Nenhum key result com "${busca}".` };

      const resultado = [];
      for (const kr of krs) {
        const { data: checkins } = await db
          .from("okr_checkins")
          .select("previous_value, new_value, comment, confidence, created_at")
          .eq("key_result_id", kr.id)
          .order("created_at", { ascending: true })
          .limit(30);
        resultado.push({
          ...descreverKr(kr as unknown as KrLinha),
          objetivo: (kr as { objective?: { title?: string } }).objective?.title ?? null,
          checkins: (checkins ?? []).map((c) => ({
            data: c.created_at,
            de: c.previous_value,
            para: c.new_value,
            comentario: c.comment,
          })),
        });
      }
      return { encontrados: resultado.length, key_results: resultado };
    }

    default:
      throw new Error(`Ferramenta desconhecida: ${nome}`);
  }
}
