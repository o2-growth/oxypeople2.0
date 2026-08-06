/**
 * Papel de alguém dentro de um time.
 *
 * A coluna `team_members.role` nasceu com o comentário `-- leader, member`, mas
 * a interface só sabe inserir 'member' e todo o cadastro real foi feito por
 * script gravando 'lead'. O resultado é que os 9 líderes de time existiam no
 * banco e não eram líderes para o código: nenhum badge, nenhuma permissão, e a
 * RLS de objetivos negando edição a quem lidera o time.
 *
 * Aceitar as duas grafias na leitura resolve sem depender de migrar dado, e
 * `TEAM_LEAD_ROLE` fixa uma só na escrita para a divergência não crescer.
 */
export const TEAM_LEAD_ROLE = "lead";

const PAPEIS_DE_LIDER = new Set(["lead", "leader"]);

export function isTeamLead(role: string | null | undefined): boolean {
  return role != null && PAPEIS_DE_LIDER.has(role.toLowerCase());
}
