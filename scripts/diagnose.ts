import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://ixtsnaxhgyoeaotrched.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dHNuYXhoZ3lvZWFvdHJjaGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg2ODIzMSwiZXhwIjoyMDg3NDQ0MjMxfQ.iCHfApk-PaUoC1uVXBI2Buwlt2GazVGJ1piHf9oeNQc",
  { auth: { persistSession: false } }
);

const companies = [
  { name: "O2 Inc", id: "6c864476-a087-408a-b650-a0f9601b9617" },
  { name: "o2-growth", id: "4a6cdaea-daef-47d2-897f-54d5ae999638" },
];

for (const co of companies) {
  console.log(`\n=== ${co.name} ===`);

  const { data: depts } = await sb.from("departments").select("name").eq("company_id", co.id).order("name");
  console.log(`departments (${depts?.length ?? 0}): ${depts?.map(d => d.name).join(", ")}`);

  const { data: teams } = await sb.from("teams").select("name, department").eq("company_id", co.id).order("name");
  console.log(`teams (${teams?.length ?? 0}):`);
  teams?.forEach(t => console.log(`  - ${t.name}  [dept: ${t.department}]`));

  const { data: objs } = await sb.from("objectives").select("department").eq("company_id", co.id).not("department", "is", null);
  const uniqueDepts = [...new Set(objs?.map(o => o.department))].sort();
  console.log(`objectives.department values: ${uniqueDepts.join(", ") || "(nenhum)"}`);
}
