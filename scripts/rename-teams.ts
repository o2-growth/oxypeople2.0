import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://ixtsnaxhgyoeaotrched.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dHNuYXhoZ3lvZWFvdHJjaGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg2ODIzMSwiZXhwIjoyMDg3NDQ0MjMxfQ.iCHfApk-PaUoC1uVXBI2Buwlt2GazVGJ1piHf9oeNQc",
  { auth: { persistSession: false } }
);

const COMPANY_ID = "4a6cdaea-daef-47d2-897f-54d5ae999638";

const { data: teams, error } = await sb
  .from("teams")
  .select("id, name")
  .eq("company_id", COMPANY_ID)
  .order("name");

if (error) throw error;

const strip = (name: string) =>
  name.replace(/^Time de /i, "").replace(/^Time /i, "").trim();

const toRename = (teams ?? []).filter((t) => strip(t.name) !== t.name);

console.log(`Times a renomear: ${toRename.length}`);
for (const t of toRename) {
  const newName = strip(t.name);
  const { error: err } = await sb.from("teams").update({ name: newName }).eq("id", t.id);
  if (err) throw err;
  console.log(`  ✓ "${t.name}" → "${newName}"`);
}

const { data: final } = await sb.from("teams").select("name").eq("company_id", COMPANY_ID).order("name");
console.log(`\nTimes após renomeação (${final?.length}):`);
final?.forEach((t) => console.log(`  - ${t.name}`));
