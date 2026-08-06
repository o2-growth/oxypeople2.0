import { describe, it, expect } from "vitest";
import { isTeamLead, TEAM_LEAD_ROLE } from "./roles";

describe("isTeamLead", () => {
  it("reconhece 'lead', que é o que está gravado no banco", () => {
    expect(isTeamLead("lead")).toBe(true);
  });

  it("reconhece 'leader', a grafia do comentário original da coluna", () => {
    expect(isTeamLead("leader")).toBe(true);
  });

  it("não confunde membro comum com líder", () => {
    expect(isTeamLead("member")).toBe(false);
  });

  it("trata ausência de papel como membro", () => {
    expect(isTeamLead(null)).toBe(false);
    expect(isTeamLead(undefined)).toBe(false);
    expect(isTeamLead("")).toBe(false);
  });

  it("ignora caixa — cadastro manual não deveria decidir permissão", () => {
    expect(isTeamLead("Lead")).toBe(true);
    expect(isTeamLead("LEADER")).toBe(true);
  });

  it("o papel gravado em novas escritas é reconhecido por ele mesmo", () => {
    expect(isTeamLead(TEAM_LEAD_ROLE)).toBe(true);
  });
});
