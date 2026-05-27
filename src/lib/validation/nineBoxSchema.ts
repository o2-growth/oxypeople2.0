import { z } from "zod";

export const nineBoxSnapshotSchema = z
  .object({
    name: z
      .string()
      .min(1, "Nome obrigatório")
      .max(120, "Máximo 120 caracteres"),
    cycle_id: z.string().uuid("Ciclo inválido").nullable(),
    target_all: z.boolean(),
    target_departments: z.array(z.string().uuid()).default([]),
    target_teams: z.array(z.string().uuid()).default([]),
  })
  .superRefine((value, ctx) => {
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

export type NineBoxSnapshotFormValues = z.infer<typeof nineBoxSnapshotSchema>;

export const DEFAULT_NINE_BOX_FORM: NineBoxSnapshotFormValues = {
  name: "",
  cycle_id: null,
  target_all: true,
  target_departments: [],
  target_teams: [],
};
