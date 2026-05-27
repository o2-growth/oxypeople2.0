import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://ixtsnaxhgyoeaotrched.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dHNuYXhoZ3lvZWFvdHJjaGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg2ODIzMSwiZXhwIjoyMDg3NDQ0MjMxfQ.iCHfApk-PaUoC1uVXBI2Buwlt2GazVGJ1piHf9oeNQc",
  { auth: { persistSession: false } }
);

const COMPANY_ID = "4a6cdaea-daef-47d2-897f-54d5ae999638";

const { data: squads } = await sb
  .from("teams")
  .select("id, name")
  .eq("company_id", COMPANY_ID)
  .like("name", "Squad %");

console.log(`Squads encontrados: ${squads?.length ?? 0}`);
squads?.forEach(s => console.log(`  - ${s.name}`));

if (squads?.length) {
  const { error } = await sb.from("teams").delete().in("id", squads.map(s => s.id));
  if (error) throw error;
  console.log(`\n✓ ${squads.length} Squads removidos`);
}

const { data: remaining } = await sb.from("teams").select("name").eq("company_id", COMPANY_ID).order("name");
console.log(`\nTimes restantes (${remaining?.length}):`);
remaining?.forEach(t => console.log(`  - ${t.name}`));
