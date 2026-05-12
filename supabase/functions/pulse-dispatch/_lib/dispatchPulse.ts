import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const BATCH_SIZE = 100;

interface PulseRow {
  id: string;
  company_id: string;
  name: string;
  question: string;
  target_all: boolean;
  target_departments: string[];
  target_teams: string[];
}

export interface DispatchResult {
  targetCount: number;
  notificationsCreated: number;
  error?: string;
}

export async function dispatchPulse(
  supabase: ReturnType<typeof createClient>,
  pulse: PulseRow,
): Promise<DispatchResult> {
  let userIds: string[];

  if (pulse.target_all) {
    const { data, error } = await supabase
      .from("company_memberships")
      .select("user_id")
      .eq("company_id", pulse.company_id)
      .eq("status", "active");
    if (error) return { targetCount: 0, notificationsCreated: 0, error: error.message };
    userIds = (data ?? []).map((r: { user_id: string }) => r.user_id);
  } else {
    const ids = new Set<string>();

    if (pulse.target_departments.length > 0) {
      const { data } = await supabase
        .from("company_memberships")
        .select("user_id")
        .eq("company_id", pulse.company_id)
        .eq("status", "active")
        .in("department_id", pulse.target_departments);
      (data ?? []).forEach((r: { user_id: string }) => ids.add(r.user_id));
    }

    if (pulse.target_teams.length > 0) {
      const { data } = await supabase
        .from("team_members")
        .select("user_id")
        .in("team_id", pulse.target_teams);
      (data ?? []).forEach((r: { user_id: string }) => ids.add(r.user_id));
    }

    userIds = Array.from(ids);
  }

  if (userIds.length === 0) {
    await supabase
      .from("pulse_surveys")
      .update({ last_dispatched_at: new Date().toISOString() })
      .eq("id", pulse.id);
    return { targetCount: 0, notificationsCreated: 0 };
  }

  let created = 0;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    const rows = batch.map((userId) => ({
      user_id: userId,
      company_id: pulse.company_id,
      type: "pulse_request",
      title: `Pulse: ${pulse.name}`,
      message: pulse.question,
      reference_id: pulse.id,
      reference_type: "pulse_survey",
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) {
      return { targetCount: userIds.length, notificationsCreated: created, error: error.message };
    }
    created += batch.length;
  }

  await supabase
    .from("pulse_surveys")
    .update({ last_dispatched_at: new Date().toISOString() })
    .eq("id", pulse.id);

  return { targetCount: userIds.length, notificationsCreated: created };
}
