import type { TargetAudience } from "@/components/automation/TargetAudienceSelector";

/**
 * Converte TargetAudience para o formato de array armazenado no banco
 * Formato: ["all"] ou ["dept:Marketing", "dept:TI"] ou ["team:uuid1", "team:uuid2"]
 */
export function audienceToArray(audience: TargetAudience): string[] {
  if (audience.type === "all") {
    return ["all"];
  }

  if (audience.type === "department" && audience.departmentIds?.length) {
    return audience.departmentIds.map((d) => `dept:${d}`);
  }

  if (audience.type === "team" && audience.teamIds?.length) {
    return audience.teamIds.map((t) => `team:${t}`);
  }

  return ["all"];
}

/**
 * Converte o array do banco para o formato TargetAudience
 */
export function arrayToAudience(arr: string[] | null): TargetAudience {
  if (!arr || arr.length === 0 || arr.includes("all")) {
    return { type: "all" };
  }

  const depts = arr
    .filter((s) => s.startsWith("dept:"))
    .map((s) => s.replace("dept:", ""));

  if (depts.length > 0) {
    return { type: "department", departmentIds: depts };
  }

  const teams = arr
    .filter((s) => s.startsWith("team:"))
    .map((s) => s.replace("team:", ""));

  if (teams.length > 0) {
    return { type: "team", teamIds: teams };
  }

  return { type: "all" };
}

/**
 * Retorna label legível para o público-alvo
 */
export function getAudienceLabel(arr: string[] | null): string {
  if (!arr || arr.length === 0 || arr.includes("all")) {
    return "Todos";
  }

  const depts = arr
    .filter((s) => s.startsWith("dept:"))
    .map((s) => s.replace("dept:", ""));

  if (depts.length > 0) {
    return depts.length === 1 ? depts[0] : `${depts.length} áreas`;
  }

  const teams = arr
    .filter((s) => s.startsWith("team:"))
    .map((s) => s.replace("team:", ""));

  if (teams.length > 0) {
    return `${teams.length} time(s)`;
  }

  return "Todos";
}
