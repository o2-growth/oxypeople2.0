// Os textos vieram dos 124 posts que o Feedz publicou até 25/07/2026 e estão
// importados em company_events — a empresa já reconhece esse tom, e mudá-lo
// faria a volta do aviso parecer outra coisa.

export interface Pessoa {
  fullName: string;
  years?: number;
}

export function slackAniversario(p: Pessoa): string {
  return `🎂 Hoje é aniversário de *${p.fullName}* 🥳🥳🥳\n\nManda teu parabéns aqui nos comentários 👇👇👇`;
}

export function slackO2versario(p: Pessoa): string {
  const anos = p.years ?? 1;
  const tempo = anos === 1 ? "1 ano" : `${anos} anos`;
  return `ÉÉÉÉ HOJEEE!!!\n\nSim, *${p.fullName}* completa hoje ${tempo} na nossa empresa. 🎉\n\nBORA COMEMORAR ???`;
}

/** Assunto do e-mail do dia — um só, mesmo com várias celebrações. */
export function assuntoEmail(aniversarios: Pessoa[], o2versarios: Pessoa[]): string {
  const nomes = [...aniversarios, ...o2versarios].map((p) => primeiroNome(p.fullName));
  if (nomes.length === 1) {
    return aniversarios.length === 1
      ? `🎂 Hoje é aniversário de ${nomes[0]}`
      : `🎉 ${nomes[0]} faz aniversário de O2 hoje`;
  }
  return `🎉 Hoje na O2: ${listar(nomes)}`;
}

export function htmlEmail(aniversarios: Pessoa[], o2versarios: Pessoa[]): string {
  const bloco = (titulo: string, itens: string[]) =>
    itens.length === 0
      ? ""
      : `<p style="margin:0 0 8px;font-weight:600;color:#111">${titulo}</p>
         <ul style="margin:0 0 20px;padding-left:20px;color:#333">${itens
           .map((i) => `<li style="margin-bottom:4px">${i}</li>`)
           .join("")}</ul>`;

  const corpo = [
    bloco(
      "🎂 Aniversário",
      aniversarios.map((p) => escapar(p.fullName)),
    ),
    bloco(
      "🎉 O2versário",
      o2versarios.map((p) => {
        const anos = p.years ?? 1;
        return `${escapar(p.fullName)} — ${anos} ${anos === 1 ? "ano" : "anos"} de casa`;
      }),
    ),
  ].join("");

  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 16px;font-size:18px;color:#111">Hoje tem gente para comemorar 🥳</h2>
  ${corpo}
  <p style="margin:0;color:#666;font-size:13px">Passa lá no Slack e manda um parabéns.</p>
</div>`;
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

function listar(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
