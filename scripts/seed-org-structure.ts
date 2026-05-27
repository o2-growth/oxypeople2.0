import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ixtsnaxhgyoeaotrched.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dHNuYXhoZ3lvZWFvdHJjaGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg2ODIzMSwiZXhwIjoyMDg3NDQ0MjMxfQ.iCHfApk-PaUoC1uVXBI2Buwlt2GazVGJ1piHf9oeNQc";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const AREAS = [
  { name: "Growth", color: "#10B981" },
  { name: "Comercial", color: "#3B82F6" },
  { name: "Operação", color: "#F97316" },
  { name: "Backoffice", color: "#8B5CF6" },
  { name: "Tecnologia", color: "#6B7280" },
];

const TEAMS: { name: string; area: string }[] = [
  { name: "Time Marketing", area: "Growth" },
  { name: "Time IA", area: "Growth" },
  { name: "Time Expansão", area: "Growth" },
  { name: "Time Inbound", area: "Comercial" },
  { name: "Time Outbound", area: "Comercial" },
  { name: "Time Eventos", area: "Comercial" },
  { name: "Time Franchising", area: "Comercial" },
  { name: "Time Setup", area: "Operação" },
  { name: "Time CAAS", area: "Operação" },
  { name: "Time Serviços Especiais", area: "Operação" },
  { name: "Time BPO", area: "Operação" },
  { name: "Time Financeiro", area: "Backoffice" },
  { name: "Time Administrativo", area: "Backoffice" },
  { name: "Time de Pessoas e Cultura", area: "Backoffice" },
  { name: "Time Jurídico e Tributário", area: "Backoffice" },
  // Tecnologia: times a definir com Vini
];

async function seed() {
  // Buscar a empresa
  const { data: companies, error: compErr } = await supabase
    .from("companies")
    .select("id, name")
    .limit(5);

  if (compErr) throw compErr;
  if (!companies?.length) throw new Error("Nenhuma empresa encontrada");

  console.log("Empresas encontradas:");
  companies.forEach((c) => console.log(`  - ${c.name} (${c.id})`));

  const company = companies[0];
  const companyId = company.id;
  console.log(`\nUsando empresa: ${company.name} (${companyId})`);

  // Verificar departamentos existentes
  const { data: existingDepts } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", companyId);

  if (existingDepts?.length) {
    console.log("\nDepartamentos existentes que serão removidos:");
    existingDepts.forEach((d) => console.log(`  - ${d.name}`));
  }

  // Verificar times existentes
  const { data: existingTeams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("company_id", companyId);

  if (existingTeams?.length) {
    console.log("\nTimes existentes que serão removidos:");
    existingTeams.forEach((t) => console.log(`  - ${t.name}`));
  }

  // Deletar times existentes
  if (existingTeams?.length) {
    const { error: delTeamsErr } = await supabase
      .from("teams")
      .delete()
      .eq("company_id", companyId);
    if (delTeamsErr) throw delTeamsErr;
    console.log(`\n✓ ${existingTeams.length} times removidos`);
  }

  // Deletar departamentos existentes
  if (existingDepts?.length) {
    const { error: delDeptsErr } = await supabase
      .from("departments")
      .delete()
      .eq("company_id", companyId);
    if (delDeptsErr) throw delDeptsErr;
    console.log(`✓ ${existingDepts.length} departamentos removidos`);
  }

  // Inserir áreas (departamentos)
  console.log("\nInserindo áreas:");
  const areaMap = new Map<string, string>();

  for (const area of AREAS) {
    const { data, error } = await supabase
      .from("departments")
      .insert({ company_id: companyId, name: area.name, color: area.color })
      .select("id")
      .single();

    if (error) throw error;
    areaMap.set(area.name, data.id);
    console.log(`  ✓ ${area.name} (${data.id})`);
  }

  // Inserir times
  console.log("\nInserindo times:");
  for (const team of TEAMS) {
    const departmentId = areaMap.get(team.area);
    if (!departmentId) throw new Error(`Área não encontrada: ${team.area}`);

    const { error } = await supabase.from("teams").insert({
      company_id: companyId,
      name: team.name,
      department: team.area,
      department_id: departmentId,
    });

    if (error) throw error;
    console.log(`  ✓ ${team.name} → ${team.area}`);
  }

  console.log("\n✅ Estrutura organizacional atualizada com sucesso!");
  console.log(`   ${AREAS.length} áreas | ${TEAMS.length} times`);
}

seed().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});
