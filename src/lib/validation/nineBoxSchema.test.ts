import { describe, it, expect } from "vitest";
import {
  nineBoxSnapshotSchema,
  DEFAULT_NINE_BOX_FORM,
} from "./nineBoxSchema";

const VALID = {
  name: "Calibração Q2 2026",
  cycle_id: "00000000-0000-0000-0000-000000000001",
  target_all: true,
  target_departments: [],
  target_teams: [],
};

describe("nineBoxSnapshotSchema", () => {
  it("DEFAULT é inválido (name vazio)", () => {
    expect(nineBoxSnapshotSchema.safeParse(DEFAULT_NINE_BOX_FORM).success).toBe(false);
  });

  it("VALID passa", () => {
    expect(nineBoxSnapshotSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejeita name > 120 chars", () => {
    expect(
      nineBoxSnapshotSchema.safeParse({ ...VALID, name: "a".repeat(121) }).success,
    ).toBe(false);
  });

  it("aceita cycle_id null", () => {
    expect(nineBoxSnapshotSchema.safeParse({ ...VALID, cycle_id: null }).success).toBe(true);
  });

  it("rejeita cycle_id inválido (não UUID)", () => {
    expect(
      nineBoxSnapshotSchema.safeParse({ ...VALID, cycle_id: "not-uuid" }).success,
    ).toBe(false);
  });

  it("rejeita target_all=false sem dept nem team", () => {
    expect(
      nineBoxSnapshotSchema.safeParse({
        ...VALID,
        target_all: false,
      }).success,
    ).toBe(false);
  });

  it("aceita target_all=false com 1 área", () => {
    expect(
      nineBoxSnapshotSchema.safeParse({
        ...VALID,
        target_all: false,
        target_departments: ["00000000-0000-0000-0000-000000000002"],
      }).success,
    ).toBe(true);
  });
});
