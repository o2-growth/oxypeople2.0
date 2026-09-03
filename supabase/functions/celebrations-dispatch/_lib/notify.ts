// Canais externos da rotina de celebrações:
//   - E-mail: webhook do n8n (Webhook → Gmail o2@o2inc.com.br)
//   - Slack: um post no canal da empresa por pessoa celebrada
//
// Mesma mecânica do pulse (pulse-dispatch/_lib/notify.ts), que é o caminho já
// em produção. Cada função é best-effort: falhar em avisar não pode derrubar a
// rotina nem impedir o outro canal.

const SLACK_API_URL = "https://slack.com/api";

export type Logger = (
  level: "info" | "warn" | "error",
  msg: string,
  ctx?: Record<string, unknown>,
) => void;

export interface EmailTarget {
  email: string;
  fullName: string | null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

/**
 * Envia o e-mail do dia via webhook do n8n.
 * No-op se N8N_ENPS_WEBHOOK_URL / N8N_ENPS_SECRET não estiverem configurados.
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
    log("info", "celebrations:email-skip", { reason: "no N8N webhook/secret" });
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
        log("warn", "celebrations:email-failed", { status: res.status, email: t.email });
        return false;
      }
      return true;
    } catch (err) {
      log("warn", "celebrations:email-exception", {
        msg: (err as Error).message,
        email: t.email,
      });
      return false;
    }
  });
  return results.filter(Boolean).length;
}

/** Posta uma mensagem no canal Slack da empresa. */
export async function postSlackChannel(
  channel: string | null,
  text: string,
  log: Logger,
): Promise<boolean> {
  const botToken = Deno.env.get("SLACK_BOT_TOKEN");
  if (!botToken) {
    log("info", "celebrations:slack-skip", { reason: "no SLACK_BOT_TOKEN" });
    return false;
  }
  if (!channel) {
    log("info", "celebrations:slack-skip", { reason: "no channel configured" });
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
      log("warn", "celebrations:slack-failed", { error: data.error });
      return false;
    }
    return true;
  } catch (err) {
    log("warn", "celebrations:slack-exception", { msg: (err as Error).message });
    return false;
  }
}
