import { z } from "zod";

export const PULSE_QUESTION_TYPES = ["scale_1_5", "enps_0_10", "mood_emoji"] as const;
export type PulseQuestionType = (typeof PULSE_QUESTION_TYPES)[number];

export const PULSE_FREQUENCIES = ["weekly", "biweekly", "monthly"] as const;
export type PulseFrequency = (typeof PULSE_FREQUENCIES)[number];

export const pulseSurveySchema = z
  .object({
    name: z
      .string()
      .min(1, "Nome é obrigatório")
      .max(80, "Máximo 80 caracteres"),
    question: z
      .string()
      .min(1, "Pergunta é obrigatória")
      .max(300, "Máximo 300 caracteres"),
    question_type: z.enum(PULSE_QUESTION_TYPES, {
      errorMap: () => ({ message: "Tipo de pergunta inválido" }),
    }),
    frequency: z.enum(PULSE_FREQUENCIES, {
      errorMap: () => ({ message: "Frequência inválida" }),
    }),
    day_of_week: z
      .number({ invalid_type_error: "Selecione o dia da semana" })
      .int()
      .min(0)
      .max(6)
      .nullable(),
    day_of_month: z
      .number({ invalid_type_error: "Selecione o dia do mês" })
      .int()
      .min(1)
      .max(28)
      .nullable(),
    send_hour_utc: z
      .number({ invalid_type_error: "Hora inválida" })
      .int()
      .min(0)
      .max(23),
    target_all: z.boolean(),
    target_departments: z.array(z.string().uuid()).default([]),
    target_teams: z.array(z.string().uuid()).default([]),
    anonymous: z.boolean(),
    require_comment_below: z
      .number()
      .int()
      .min(0)
      .max(10)
      .nullable(),
    active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.frequency === "weekly" || value.frequency === "biweekly") {
      if (value.day_of_week === null || value.day_of_week === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["day_of_week"],
          message: "Escolha o dia da semana",
        });
      }
    }
    if (value.frequency === "monthly") {
      if (
        value.day_of_month === null ||
        value.day_of_month === undefined ||
        value.day_of_month < 1 ||
        value.day_of_month > 28
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["day_of_month"],
          message: "Defina o dia do mês para envio quando a frequência for mensal.",
        });
      }
    }
    if (!value.target_all) {
      if (value.target_departments.length === 0 && value.target_teams.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["target_all"],
          message: "Selecione ao menos 1 área ou time",
        });
      }
    }
  });

export type PulseSurveyFormValues = z.infer<typeof pulseSurveySchema>;

export const DEFAULT_PULSE_FORM: PulseSurveyFormValues = {
  name: "",
  question: "",
  question_type: "scale_1_5",
  frequency: "weekly",
  day_of_week: 1,
  day_of_month: null,
  send_hour_utc: 12,
  target_all: true,
  target_departments: [],
  target_teams: [],
  anonymous: false,
  require_comment_below: null,
  active: true,
};
