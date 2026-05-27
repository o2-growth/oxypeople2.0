import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://ixtsnaxhgyoeaotrched.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dHNuYXhoZ3lvZWFvdHJjaGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg2ODIzMSwiZXhwIjoyMDg3NDQ0MjMxfQ.iCHfApk-PaUoC1uVXBI2Buwlt2GazVGJ1piHf9oeNQc",
  { auth: { persistSession: false } }
);

const COMPANY_ID = "6c864476-a087-408a-b650-a0f9601b9617";
const VALID_AREAS = new Set(["Growth", "Comercial", "Operação", "Backoffice", "Tecnologia"]);

const { data: objectives } = await sb
  .from("objectives")
  .select("id, title, department")
  .eq("company_id", COMPANY_ID)
  .not("department", "is", null);

console.log(`Objetivos com campo 'department' preenchido: ${objectives?.length ?? 0}`);

const toNull = objectives?.filter((o) => o.department && !VALID_AREAS.has(o.department)) ?? [];
const valid = objectives?.filter((o) => o.department && VALID_AREAS.has(o.department)) ?? [];

console.log(`  Já corretos: ${valid.length}`);
valid.forEach((o) => console.log(`    ✓ "${o.title}" → ${o.department}`));

console.log(`  Com área inválida (serão limpos): ${toNull.length}`);
toNull.forEach((o) => console.log(`    ✗ "${o.title}" → "${o.department}"`));

if (toNull.length) {
  const { error } = await sb
    .from("objectives")
    .update({ department: null })
    .in("id", toNull.map((o) => o.id));
  if (error) throw error;
  console.log(`\n✓ ${toNull.length} objetivos atualizados (department → null)`);
}

console.log("\n✅ Concluído.");
