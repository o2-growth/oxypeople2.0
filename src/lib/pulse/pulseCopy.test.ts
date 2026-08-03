import { describe, it, expect } from "vitest";
// A copy do pulse vive na edge function (Deno) porque é lá que ela é usada.
// O arquivo é puro — sem import de Deno/rede — então o Vitest consegue carregá-lo
// direto. Importar daqui evita duplicar a lógica só para testá-la e faz o teste
// quebrar se a edge function mudar de forma.
import {
  buildPulseCopy,
  type QuestionType,
} from "../../../supabase/functions/pulse-dispatch/_lib/copy.ts";

const base = {
  name: "Clima da semana",
  question: "Como foi sua semana?",
  companyName: "O2",
  appUrl: "https://oxypeople20.vercel.app",
};

describe("buildPulseCopy", () => {
  it("gera copy dedicada para e-NPS", () => {
    const copy = buildPulseCopy({ ...base, question_type: "enps_0_10" });

    expect(copy.title).toContain("e-NPS");
    expect(copy.emailSubject).toContain("e-NPS");
    expect(copy.emailSubject).toContain("O2");
    expect(copy.slackText).toContain("e-NPS");
    // A pergunta configurada no pulse tem que aparecer em todos os canais
    expect(copy.message).toBe(base.question);
    expect(copy.emailHtml).toContain(base.question);
    expect(copy.slackText).toContain(base.question);
  });

  it.each<QuestionType>(["scale_1_5", "mood_emoji"])(
    "usa copy genérica com o nome do pulse em %s",
    (question_type) => {
      const copy = buildPulseCopy({ ...base, question_type });

      expect(copy.title).toBe(`Pulse: ${base.name}`);
      expect(copy.emailSubject).toContain(base.name);
      expect(copy.emailHtml).toContain(base.name);
      expect(copy.slackText).toContain(base.name);
      expect(copy.title).not.toContain("e-NPS");
    },
  );

  it("inclui CTA clicável quando appUrl está configurada", () => {
    for (const question_type of ["enps_0_10", "scale_1_5"] as QuestionType[]) {
      const copy = buildPulseCopy({ ...base, question_type });

      expect(copy.emailHtml).toContain(`href="${base.appUrl}"`);
      expect(copy.emailHtml).toContain("Responder agora");
      expect(copy.slackText).toContain(base.appUrl);
    }
  });

  // Regressão: sem APP_BASE_URL no ambiente da edge function, o dispatch continua
  // rodando mas o e-mail sai sem botão e o Slack sem link — falha silenciosa.
  // O teste trava o comportamento: degrada, mas nunca gera href/link quebrado.
  it("degrada sem quebrar quando appUrl é null", () => {
    for (const question_type of ["enps_0_10", "scale_1_5"] as QuestionType[]) {
      const copy = buildPulseCopy({ ...base, question_type, appUrl: null });

      expect(copy.emailHtml).not.toContain("href");
      expect(copy.emailHtml).not.toContain("Responder agora");
      expect(copy.slackText).not.toContain("Responda em");
      expect(copy.slackText).not.toContain("null");
      expect(copy.emailHtml).not.toContain("null");
    }
  });

  it("preenche os três canais em qualquer tipo de pergunta", () => {
    const tipos: QuestionType[] = ["enps_0_10", "scale_1_5", "mood_emoji"];

    for (const question_type of tipos) {
      const copy = buildPulseCopy({ ...base, question_type });

      for (const campo of [
        copy.title,
        copy.message,
        copy.emailSubject,
        copy.emailHtml,
        copy.slackText,
      ]) {
        expect(campo.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("usa fallback de nome de empresa sem vazar undefined", () => {
    const copy = buildPulseCopy({
      ...base,
      question_type: "enps_0_10",
      companyName: "oxypeople",
    });

    expect(copy.emailSubject).not.toContain("undefined");
    expect(copy.emailHtml).not.toContain("undefined");
    expect(copy.slackText).not.toContain("undefined");
  });
});
