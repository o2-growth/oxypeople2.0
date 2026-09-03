import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { postSlackChannel, sendEmails, type EmailTarget } from "./_lib/notify.ts";
import {
  assuntoEmail,
  htmlEmail,
  slackAniversario,
  slackO2versario,
  type Pessoa,
} from "./_lib/copy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-cron-secret, x-client-info, apikey, content-type",
};

function log(level: "info" | "warn" | "error", msg: string, ctx?: Record<string, unknown>) {
  const payload = { level, msg, ts: new Date().toISOString(), ...ctx };
  if (level === "error") console.error(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}

/**
 * Hoje em São Paulo, como 'YYYY-MM-DD'.
 *
 * A rotina roda 10:00 UTC (07:00 BRT). Usar `new Date()` direto daria a data
 * certa nesse horário, mas erraria em qualquer execução entre 21h e meia-noite
 * de Brasília — que é exatamente quando alguém dispara na mão para testar, e
 * quando o parabéns sairia um dia adiantado.
 */
function hojeBRT(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

interface MembroRow {
  user_id: string;
  hire_date: string | null;
  users: { id: string; full_name: string | null; email: string; birth_date: string | null } | null;
}

interface Celebrado extends Pessoa {
  userId: string;
  kind: "birthday" | "work_anniversary";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Mesmo esquema do pulse: quem dispara é um agendador externo, e um segredo
  // dedicado evita guardar a service_role fora do Supabase.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    if (req.headers.get("x-cron-secret") !== cronSecret) {
      log("warn", "celebrations:sem-autorizacao");
      return new Response(JSON.stringify({ success: false, error: "não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const startedAt = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const canal =
    Deno.env.get("CELEBRATIONS_SLACK_CHANNEL_ID") ??
    Deno.env.get("PULSE_SLACK_CHANNEL_ID") ??
    null;

  const hoje = hojeBRT();
  const mesDia = hoje.slice(5); // 'MM-DD'
  const anoAtual = Number(hoje.slice(0, 4));

  log("info", "celebrations:start", { hoje, canal: canal ? "configurado" : "ausente" });

  try {
    // O canal do Slack é um só para toda a instalação. Com duas empresas no
    // banco (o2-growth e a O2 Inc, que tem um cadastro de teste), processar
    // todas faria o aniversário do usuário de teste aparecer no canal da
    // empresa. CELEBRATIONS_COMPANY_ID restringe a rotina à empresa dona do
    // canal; sem ele, o comportamento continua sendo processar todas.
    const empresaAlvo = Deno.env.get("CELEBRATIONS_COMPANY_ID");

    let consulta = supabase.from("companies").select("id, name");
    if (empresaAlvo) consulta = consulta.eq("id", empresaAlvo);

    const { data: empresas, error: erroEmpresas } = await consulta;
    if (erroEmpresas) throw erroEmpresas;

    const resultado: Array<{
      company_id: string;
      celebracoes: number;
      slack: number;
      emails: number;
      jaEnviados: number;
    }> = [];

    for (const empresa of empresas ?? []) {
      const { data: membros, error: erroMembros } = await supabase
        .from("company_memberships")
        .select("user_id, hire_date, users!company_memberships_user_id_fkey(id, full_name, email, birth_date)")
        .eq("company_id", empresa.id)
        .eq("status", "active");
      if (erroMembros) throw erroMembros;

      const ativos = (membros ?? []) as unknown as MembroRow[];
      const celebrados: Celebrado[] = [];

      for (const m of ativos) {
        const nome = m.users?.full_name?.trim();
        if (!nome) continue;

        // Comparar 'MM-DD' como texto evita converter para Date e cair no fuso
        // do servidor — 1990-03-09 vira 08/03 em qualquer parse UTC.
        if (m.users?.birth_date?.slice(5) === mesDia) {
          celebrados.push({ userId: m.user_id, fullName: nome, kind: "birthday" });
        }

        if (m.hire_date?.slice(5) === mesDia) {
          const anos = anoAtual - Number(m.hire_date.slice(0, 4));
          // Ano zero é a admissão de hoje, não o2versário.
          if (anos >= 1) {
            celebrados.push({
              userId: m.user_id,
              fullName: nome,
              kind: "work_anniversary",
              years: anos,
            });
          }
        }
      }

      if (celebrados.length === 0) {
        resultado.push({
          company_id: empresa.id,
          celebracoes: 0,
          slack: 0,
          emails: 0,
          jaEnviados: 0,
        });
        continue;
      }

      // Quem já foi comunicado hoje sai da lista: a rotina pode rodar de novo
      // por retry do agendador ou disparo manual.
      const { data: jaFeitos } = await supabase
        .from("celebration_dispatches")
        .select("user_id, kind")
        .eq("company_id", empresa.id)
        .eq("ref_date", hoje);

      const feito = new Set((jaFeitos ?? []).map((r) => `${r.user_id}:${r.kind}`));
      const pendentes = celebrados.filter((c) => !feito.has(`${c.userId}:${c.kind}`));

      if (pendentes.length === 0) {
        log("info", "celebrations:tudo-ja-enviado", {
          company_id: empresa.id,
          total: celebrados.length,
        });
        resultado.push({
          company_id: empresa.id,
          celebracoes: celebrados.length,
          slack: 0,
          emails: 0,
          jaEnviados: celebrados.length,
        });
        continue;
      }

      // Slack: uma mensagem por pessoa, para cada uma ter sua thread de
      // parabéns — juntar todo mundo num post só transformaria o parabéns
      // individual em resposta a uma lista.
      const slackOk = new Map<string, boolean>();
      for (const c of pendentes) {
        const texto =
          c.kind === "birthday" ? slackAniversario(c) : slackO2versario(c);
        const ok = await postSlackChannel(canal, texto, log);
        slackOk.set(`${c.userId}:${c.kind}`, ok);
      }

      // E-mail: um por dia para a empresa inteira, não um por celebração.
      const aniversarios = pendentes.filter((c) => c.kind === "birthday");
      const o2versarios = pendentes.filter((c) => c.kind === "work_anniversary");
      const idsCelebrados = new Set(pendentes.map((c) => c.userId));

      const destinatarios: EmailTarget[] = ativos
        .filter((m) => m.users?.email && !idsCelebrados.has(m.user_id))
        .map((m) => ({ email: m.users!.email, fullName: m.users!.full_name }));

      const enviados = await sendEmails(
        destinatarios,
        assuntoEmail(aniversarios, o2versarios),
        htmlEmail(aniversarios, o2versarios),
        log,
      );

      // O registro fecha o dia mesmo se Slack e e-mail falharem: repetir a
      // tentativa amanhã mandaria um parabéns atrasado, que é pior do que
      // nenhum. A falha fica no log e nas colunas.
      const linhas = pendentes.map((c) => ({
        company_id: empresa.id,
        user_id: c.userId,
        kind: c.kind,
        ref_date: hoje,
        years: c.years ?? null,
        slack_ok: slackOk.get(`${c.userId}:${c.kind}`) ?? false,
        emails_sent: enviados,
      }));

      const { error: erroLog } = await supabase
        .from("celebration_dispatches")
        .insert(linhas);
      if (erroLog) {
        log("error", "celebrations:log-falhou", {
          company_id: empresa.id,
          msg: erroLog.message,
        });
      }

      resultado.push({
        company_id: empresa.id,
        celebracoes: celebrados.length,
        slack: [...slackOk.values()].filter(Boolean).length,
        emails: enviados,
        jaEnviados: celebrados.length - pendentes.length,
      });
    }

    const durationMs = Date.now() - startedAt;
    log("info", "celebrations:done", { durationMs, resultado });

    return new Response(
      JSON.stringify({ success: true, date: hoje, resultado, durationMs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    log("error", "celebrations:erro", { msg: (err as Error).message });
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
