import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://ixtsnaxhgyoeaotrched.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dHNuYXhoZ3lvZWFvdHJjaGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg2ODIzMSwiZXhwIjoyMDg3NDQ0MjMxfQ.iCHfApk-PaUoC1uVXBI2Buwlt2GazVGJ1piHf9oeNQc",
  { auth: { persistSession: false } }
);

const COMPANY_ID = "6c864476-a087-408a-b650-a0f9601b9617";

// 1. Buscar membros sem área
const { data: members } = await sb
  .from("company_memberships")
  .select("id, user_id, users!company_memberships_user_id_fkey(full_name)")
  .eq("company_id", COMPANY_ID)
  .is("department_id", null)
  .in("status", ["active", "invited", "pending"]);

console.log(`Membros sem área: ${members?.length ?? 0}`);
members?.forEach((m: any) => console.log(`  - ${m.users?.full_name ?? "Sem nome"} (membership: ${m.id})`));

// 2. Buscar ID da área Operação
const { data: operacao } = await sb
  .from("departments")
  .select("id, name")
  .eq("company_id", COMPANY_ID)
  .eq("name", "Operação")
  .single();

if (!operacao) throw new Error("Área Operação não encontrada");
console.log(`\nÁrea Operação: ${operacao.id}`);

// 3. Reatribuir membros para Operação
if (members?.length) {
  const ids = members.map((m: any) => m.id);
  const { error } = await sb
    .from("company_memberships")
    .update({ department_id: operacao.id })
    .in("id", ids);
  if (error) throw error;
  console.log(`\n✓ ${ids.length} membro(s) movidos para Operação`);
} else {
  console.log("\nNenhum membro para reatribuir.");
}

// 4. Verificar objetivos com owner_department_id preenchido
const { data: objsWithDept } = await sb
  .from("objectives")
  .select("id, title, owner_department_id")
  .eq("company_id", COMPANY_ID)
  .not("owner_department_id", "is", null);

console.log(`\nObjetivos com área vinculada: ${objsWithDept?.length ?? 0}`);
if (objsWithDept?.length) {
  // Verificar quais têm dept_id válido (existente)
  const { data: depts } = await sb
    .from("departments")
    .select("id")
    .eq("company_id", COMPANY_ID);
  const validIds = new Set(depts?.map((d) => d.id) ?? []);

  const orphaned = objsWithDept.filter((o) => !validIds.has(o.owner_department_id!));
  console.log(`Objetivos com área inválida/inexistente: ${orphaned.length}`);
  orphaned.forEach((o) => console.log(`  - ${o.title}`));

  if (orphaned.length) {
    const { error } = await sb
      .from("objectives")
      .update({ owner_department_id: null })
      .in("id", orphaned.map((o) => o.id));
    if (error) throw error;
    console.log(`✓ owner_department_id limpo em ${orphaned.length} objetivo(s)`);
  }
}

// 5. Verificar se há team_id em objetivos apontando para times deletados
const { data: objsWithTeam } = await sb
  .from("objectives")
  .select("id, title, team_id")
  .eq("company_id", COMPANY_ID)
  .not("team_id", "is", null);

console.log(`\nObjetivos com time vinculado: ${objsWithTeam?.length ?? 0}`);
if (objsWithTeam?.length) {
  const { data: teams } = await sb
    .from("teams")
    .select("id")
    .eq("company_id", COMPANY_ID);
  const validTeamIds = new Set(teams?.map((t) => t.id) ?? []);
  const orphanedByTeam = objsWithTeam.filter((o) => !validTeamIds.has(o.team_id!));
  console.log(`Objetivos com time inválido/inexistente: ${orphanedByTeam.length}`);
  if (orphanedByTeam.length) {
    orphanedByTeam.forEach((o) => console.log(`  - ${o.title}`));
    const { error } = await sb
      .from("objectives")
      .update({ team_id: null })
      .in("id", orphanedByTeam.map((o) => o.id));
    if (error) throw error;
    console.log(`✓ team_id limpo em ${orphanedByTeam.length} objetivo(s)`);
  }
}

console.log("\n✅ Concluído.");
