export type QuestionType = "scale_1_5" | "enps_0_10" | "mood_emoji";

export interface PulseCopyInput {
  name: string;
  question: string;
  question_type: QuestionType;
  companyName: string;
  appUrl: string | null;
}

export interface PulseCopy {
  /** Notificação in-app */
  title: string;
  message: string;
  /** E-mail (webhook n8n → Gmail o2@o2inc.com.br) */
  emailSubject: string;
  emailHtml: string;
  /** Slack (chat.postMessage) */
  slackText: string;
}

function ctaButton(appUrl: string | null): string {
  if (!appUrl) return "";
  return `
    <p style="margin:24px 0;">
      <a href="${appUrl}"
         style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;
                text-decoration:none;font-weight:600;display:inline-block;">
        Responder agora
      </a>
    </p>`;
}

function ctaLink(appUrl: string | null): string {
  return appUrl ? ` Responda em ${appUrl}` : "";
}

/**
 * Gera as três variações de copy (in-app, e-mail, Slack) para um pulse.
 * O e-NPS (`enps_0_10`) ganha copy dedicada — os demais mantêm o formato
 * genérico "Pulse: {nome}".
 */
export function buildPulseCopy(input: PulseCopyInput): PulseCopy {
  const { name, question, question_type, companyName, appUrl } = input;

  if (question_type === "enps_0_10") {
    return {
      title: "📊 e-NPS: sua opinião importa",
      message: question,
      emailSubject: `e-NPS ${companyName}: leva menos de 1 minuto`,
      emailHtml: `
        <div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.5;">
          <h2 style="margin:0 0 8px;">Pesquisa de e-NPS</h2>
          <p>Olá! Chegou a hora da nossa pesquisa de clima na <strong>${companyName}</strong>.</p>
          <p style="font-size:16px;"><strong>${question}</strong></p>
          <p>É rápido, anônimo quando configurado, e cada resposta ajuda a melhorar o dia a dia do time.</p>
          ${ctaButton(appUrl)}
          <p style="color:#666;font-size:13px;">Se você já respondeu, pode ignorar este e-mail.</p>
        </div>`,
      slackText:
        `📊 *e-NPS ${companyName}* — sua opinião importa!\n` +
        `> ${question}\n` +
        `Leva menos de 1 minuto.${ctaLink(appUrl)}`,
    };
  }

  // Copy genérica para scale_1_5 / mood_emoji
  return {
    title: `Pulse: ${name}`,
    message: question,
    emailSubject: `Pulse ${companyName}: ${name}`,
    emailHtml: `
      <div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.5;">
        <h2 style="margin:0 0 8px;">${name}</h2>
        <p style="font-size:16px;"><strong>${question}</strong></p>
        ${ctaButton(appUrl)}
        <p style="color:#666;font-size:13px;">Se você já respondeu, pode ignorar este e-mail.</p>
      </div>`,
    slackText:
      `📣 *${name}*\n> ${question}${ctaLink(appUrl)}`,
  };
}
