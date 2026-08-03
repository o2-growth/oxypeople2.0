// Canais de notificação externos (mesma implementação do pulse-dispatch —
// edge functions do Supabase não compartilham módulos entre si, então o
// arquivo é duplicado de propósito; mudanças precisam ser espelhadas).
//   - E-mail: via webhook do n8n (Webhook → Gmail o2@o2inc.com.br)
//   - Slack DM: lookup por e-mail + mensagem direta
//   - Slack canal: 1 post no canal da empresa
// Todos são best-effort: falhas são logadas mas nunca interrompem o dispatch.

const SLACK_API_URL = "https://slack.com/api";

type Logger = (
  level: "info" | "warn" | "error",
  msg: string,
  ctx?: Record<string, unknown>,
) => void;

export interface EmailTarget {
  email: string;
  fullName: string | null;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

/**
 * Envia e-mails via webhook do n8n (que entrega pelo Gmail o2@o2inc.com.br).
 * No-op se N8N_ENPS_WEBHOOK_URL / N8N_ENPS_SECRET não estiverem configurados.
 * Retorna a quantidade de requisições aceitas (HTTP 2xx).
 */
export async function sendEmails(
  targets: EmailTarget[],
  subject: string,
  html: string,
  log: Logger,
): Promise<number> {
  const webhookUrl = Deno.env.get("N8N_ENPS_WEBHOOK_URL");
  const secret = Deno.env.get("N8N_ENPS_SECRET");
  if (!webhookUrl || !secret) {
    log("info", "notify:email-skip", { reason: "no N8N webhook/secret" });
    return 0;
  }
  if (targets.length === 0) return 0;

  const results = await mapWithConcurrency(targets, 8, async (t) => {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, to: t.email, subject, html }),
      });
      if (!res.ok) {
        log("warn", "notify:email-failed", { status: res.status, email: t.email });
        return false;
      }
      return true;
    } catch (err) {
      log("warn", "notify:email-exception", { msg: (err as Error).message, email: t.email });
      return false;
    }
  });
  return results.filter(Boolean).length;
}

/**
 * Envia DM no Slack para cada e-mail (lookupByEmail → chat.postMessage).
 * No-op se SLACK_BOT_TOKEN não estiver configurado.
 * Retorna quantas DMs foram entregues.
 */
export async function sendSlackDMs(
  targets: EmailTarget[],
  text: string,
  log: Logger,
): Promise<number> {
  const botToken = Deno.env.get("SLACK_BOT_TOKEN");
  if (!botToken) {
    log("info", "notify:slack-dm-skip", { reason: "no SLACK_BOT_TOKEN" });
    return 0;
  }
  if (targets.length === 0) return 0;
  const headers = { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" };

  const results = await mapWithConcurrency(targets, 5, async (t) => {
    try {
      const lookup = await fetch(
        `${SLACK_API_URL}/users.lookupByEmail?email=${encodeURIComponent(t.email)}`,
        { headers },
      );
      const lookupData = await lookup.json();
      if (!lookupData.ok) {
        log("info", "notify:slack-no-user", { email: t.email, error: lookupData.error });
        return false;
      }
      const userId = lookupData.user.id as string;
      const post = await fetch(`${SLACK_API_URL}/chat.postMessage`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          channel: userId,
          text,
          blocks: [{ type: "section", text: { type: "mrkdwn", text } }],
        }),
      });
      const postData = await post.json();
      if (!postData.ok) {
        log("warn", "notify:slack-dm-failed", { email: t.email, error: postData.error });
        return false;
      }
      return true;
    } catch (err) {
      log("warn", "notify:slack-dm-exception", { msg: (err as Error).message, email: t.email });
      return false;
    }
  });
  return results.filter(Boolean).length;
}

/**
 * Posta uma mensagem única no canal Slack da empresa.
 * No-op se SLACK_BOT_TOKEN ou o canal não estiverem configurados.
 */
export async function postSlackChannel(
  channel: string | null,
  text: string,
  log: Logger,
): Promise<boolean> {
  const botToken = Deno.env.get("SLACK_BOT_TOKEN");
  if (!botToken) {
    log("info", "notify:slack-channel-skip", { reason: "no SLACK_BOT_TOKEN" });
    return false;
  }
  if (!channel) {
    log("info", "notify:slack-channel-skip", { reason: "no channel configured" });
    return false;
  }
  try {
    const res = await fetch(`${SLACK_API_URL}/chat.postMessage`, {
      method: "POST",
      headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        channel,
        text,
        blocks: [{ type: "section", text: { type: "mrkdwn", text } }],
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      log("warn", "notify:slack-channel-failed", { error: data.error });
      return false;
    }
    return true;
  } catch (err) {
    log("warn", "notify:slack-channel-exception", { msg: (err as Error).message });
    return false;
  }
}
