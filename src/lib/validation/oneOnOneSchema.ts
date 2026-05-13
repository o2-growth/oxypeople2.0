import { z } from "zod";

export const oneOnOneSchema = z.object({
  counterpart_id: z.string().uuid("Selecione uma pessoa"),
  scheduled_at: z
    .string()
    .min(1, "Data obrigatória")
    .refine((v) => new Date(v) > new Date(), "A data/hora deve ser no futuro"),
  duration_minutes: z
    .number({ invalid_type_error: "Informe a duração" })
    .min(5, "Mínimo 5 minutos")
    .max(480, "Máximo 480 minutos"),
  location: z.string().max(200, "Máximo 200 caracteres").optional(),
  recurrence: z.enum(["none", "weekly", "biweekly", "monthly"]),
  i_am_member: z.boolean().default(false),
});

export type OneOnOneFormValues = z.infer<typeof oneOnOneSchema>;
