import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://ixtsnaxhgyoeaotrched.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dHNuYXhoZ3lvZWFvdHJjaGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg2ODIzMSwiZXhwIjoyMDg3NDQ0MjMxfQ.iCHfApk-PaUoC1uVXBI2Buwlt2GazVGJ1piHf9oeNQc",
  { auth: { persistSession: false } }
);

const COMPANY_ID = "4a6cdaea-daef-47d2-897f-54d5ae999638"; // o2-growth

const AREAS = [
  { name: "Growth",      color: "#10B981" },
  { name: "Comercial",   color: "#3B82F6" },
  { name: "Operação",    color: "#F97316" },
  { name: "Backoffice",  color: "#8B5CF6" },
  { name: "Tecnologia",  color: "#6B7280" },
];

const TIMES: { name: string; area: string }[] = [
  { name: "Time Marketing",              area: "Growth" },
  { name: "Time IA",                     area: "Growth" },
  { name: "Time Expansão",               area: "Growth" },
  { name: "Time Inbound",                area: "Comercial" },
  { name: "Time Outbound",               area: "Comercial" },
  { name: "Time Eventos",                area: "Comercial" },
  { name: "Time Franchising",            area: "Comercial" },
  { name: "Time Setup",                  area: "Operação" },
  { name: "Time CAAS",                   area: "Operação" },
  { name: "Time Serviços Especiais",     area: "Operação" },
  { name: "Time BPO",                    area: "Operação" },
  { name: "Time Financeiro",             area: "Backoffice" },
  { name: "Time Administrativo",         area: "Backoffice" },
  { name: "Time de Pessoas e Cultura",   area: "Backoffice" },
  { name: "Time Jurídico e Tributário",  area: "Backoffice" },
  // Tecnologia: times a definir com Vini
];

// 1. Deletar áreas antigas (ON DELETE SET NULL para memberships e teams.department_id)
const { data: oldDepts } = await sb.from("departments").select("id, name").eq("company_id", COMPANY_ID);
console.log(`Áreas antigas (${oldDepts?.length ?? 0}): ${oldDepts?.map(d => d.name).join(", ")}`);
if (oldDepts?.length) {
  await sb.from("departments").delete().eq("company_id", COMPANY_ID);
  console.log("✓ Áreas antigas removidas");
}

// 2. Deletar times antigos do tipo "Time X" (manter Squads)
const { data: oldTimes } = await sb.from("teams").select("id, name").eq("company_id", COMPANY_ID).like("name", "Time %");
if (oldTimes?.length) {
  await sb.from("teams").delete().in("id", oldTimes.map(t => t.id));
  console.log(`✓ ${oldTimes.length} times antigos removidos`);
}

// 3. Inserir as 5 áreas novas
console.log("\nInserindo áreas:");
const areaMap = new Map<string, string>();
for (const area of AREAS) {
  const { data, error } = await sb.from("departments")
    .insert({ company_id: COMPANY_ID, name: area.name, color: area.color })
    .select("id").single();
  if (error) throw error;
  areaMap.set(area.name, data.id);
  console.log(`  ✓ ${area.name} (${data.id})`);
}

// 4. Inserir os 15 times
console.log("\nInserindo times:");
for (const time of TIMES) {
  const deptId = areaMap.get(time.area)!;
  const { error } = await sb.from("teams").insert({
    company_id: COMPANY_ID,
    name: time.name,
    department: time.area,
    department_id: deptId,
  });
  if (error) throw error;
  console.log(`  ✓ ${time.name} → ${time.area}`);
}

// 5. Atualizar Squads existentes: vincular ao department_id de Operação
const operacaoId = areaMap.get("Operação")!;
const { data: squads } = await sb.from("teams").select("id, name")
  .eq("company_id", COMPANY_ID).like("name", "Squad %");
if (squads?.length) {
  await sb.from("teams").update({ department: "Operação", department_id: operacaoId })
    .in("id", squads.map(s => s.id));
  console.log(`\n✓ ${squads.length} Squads vinculados à área Operação`);
}

// 6. Limpar campo department de objetivos com valores inválidos
const VALID_AREAS = new Set(AREAS.map(a => a.name));
const { data: objs } = await sb.from("objectives").select("id, department")
  .eq("company_id", COMPANY_ID).not("department", "is", null);
const toNull = objs?.filter(o => o.department && !VALID_AREAS.has(o.department)) ?? [];
if (toNull.length) {
  await sb.from("objectives").update({ department: null }).in("id", toNull.map(o => o.id));
  console.log(`✓ ${toNull.length} objetivos com área inválida limpos`);
}

console.log("\n✅ o2-growth atualizado com sucesso!");
