// E-mail de "seu acesso está pronto" para quem acabou de ganhar conta — pelo
// sync do Pipefy ou pelo convite manual do admin (invite-user).
//
// Antes, a conta nascia com senha aleatória e ninguém recebia nada: a pessoa
// existia na plataforma sem conseguir entrar, até alguém rodar
// scripts/send-access-welcome.mjs à mão. O layout é o mesmo daquele script —
// é o e-mail que os 55 do rollout de julho receberam.
//
// Sai pelo mesmo webhook do n8n (Gmail o2@o2inc.com.br) que o pulse e as
// celebrações usam. Best-effort: falhar em avisar não derruba o sync.

const APP_URL = "https://oxypeople20.vercel.app/auth";

/**
 * Senha provisória que vai no e-mail de acesso, então precisa ser digitável:
 * 12 caracteres sem os ambíguos (0/O, 1/l/I) e um prefixo que cobre a
 * exigência de maiúscula, minúscula, número e símbolo. Uma por pessoa — a
 * padrão compartilhada (Alterar@01) vale para qualquer conta que ninguém
 * trocou.
 */
export function generateStrongPassword(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const corpo = Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
  return `Aa1!${corpo}`;
}

function primeiroNome(nome: string | null): string {
  return (nome ?? "").trim().split(/\s+/)[0] || "Olá";
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function html(nome: string, login: string, senha: string): string {
  return `<div style="margin:0;padding:0;background:#f4f6f8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f6f8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);font-family:Arial,Helvetica,sans-serif;">
        <tr><td style="background:#0b6b4a;padding:28px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">Oxy People</h1>
          <p style="margin:6px 0 0;color:#cdeede;font-size:14px;">Gestão de Pessoas · O2</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 12px;color:#0b6b4a;font-size:20px;">Olá, ${escapar(nome)}! Seu acesso está pronto 🎉</h2>
          <p style="margin:0 0 16px;color:#53626b;font-size:15px;line-height:1.6;">
            A plataforma <strong>Oxy People</strong> já está disponível para você. É onde acompanhamos OKRs,
            performance, feedbacks, PDI, 1:1s, reconhecimentos e as pesquisas de clima do time.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f6f8;border-radius:8px;margin:8px 0 20px;">
            <tr><td style="padding:16px 20px;color:#334;font-size:15px;line-height:1.8;">
              <strong>Login:</strong> ${escapar(login)}<br>
              <strong>Senha provisória:</strong> <code style="background:#e7f4ee;padding:2px 8px;border-radius:4px;color:#0b6b4a;font-size:15px;">${escapar(senha)}</code>
            </td></tr>
          </table>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px;">
            <tr><td align="center" bgcolor="#00c853" style="border-radius:8px;">
              <a href="${APP_URL}" target="_blank" rel="noopener"
                 style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
                Acessar a plataforma
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#53626b;font-size:14px;line-height:1.6;">
            🔒 <strong>Por segurança, troque sua senha no primeiro acesso.</strong> Basta entrar com a senha
            provisória acima e alterá-la nas configurações da conta.
          </p>
          <p style="margin:16px 0 0;color:#8a97a0;font-size:13px;line-height:1.6;">
            Se tiver qualquer dificuldade para entrar, é só responder este e-mail. Bom uso! 💚
          </p>
        </td></tr>
        <tr><td style="background:#f0f3f5;padding:16px 32px;color:#9aa6ad;font-size:12px;text-align:center;">
          Oxy People · O2 — este é um comunicado automático de acesso.
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`;
}

/** Envia login e senha provisória. Retorna se o webhook aceitou. */
export async function sendAccessEmail(
  login: string,
  fullName: string | null,
  senha: string,
): Promise<boolean> {
  const webhookUrl = Deno.env.get("N8N_ENPS_WEBHOOK_URL");
  const secret = Deno.env.get("N8N_ENPS_SECRET");
  if (!webhookUrl || !secret) {
    console.log(`Access email skipped for ${login}: no N8N webhook/secret`);
    return false;
  }
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        to: login,
        subject: "✅ Seu acesso à plataforma Oxy People está pronto",
        html: html(primeiroNome(fullName), login, senha),
      }),
    });
    if (!res.ok) console.warn(`Access email failed for ${login}: HTTP ${res.status}`);
    return res.ok;
  } catch (err) {
    console.warn(`Access email exception for ${login}: ${(err as Error).message}`);
    return false;
  }
}
