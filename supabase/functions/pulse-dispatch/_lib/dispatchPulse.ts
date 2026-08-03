import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { buildPulseCopy, type QuestionType } from "./copy.ts";
import {
  postPulseSlackChannel,
  sendPulseEmails,
  sendPulseSlackDMs,
  type EmailTarget,
} from "./notify.ts";

const BATCH_SIZE = 100;

type Logger = (
  level: "info" | "warn" | "error",
  msg: string,
  ctx?: Record<string, unknown>,
) => void;

const noopLog: Logger = () => {};

interface PulseRow {
  id: string;
  company_id: string;
  name: string;
  question: string;
  question_type: QuestionType;
  target_all: boolean;
  target_departments: string[];
  target_teams: string[];
}

export interface DispatchResult {
  targetCount: number;
  notificationsCreated: number;
  emailsSent: number;
  slackDMsSent: number;
  slackPosted: boolean;
  error?: string;
}

export async function dispatchPulse(
  supabase: ReturnType<typeof createClient>,
  pulse: PulseRow,
  log: Logger = noopLog,
): Promise<DispatchResult> {
  let userIds: string[];

  if (pulse.target_all) {
    const { data, error } = await supabase
      .from("company_memberships")
      .select("user_id")
      .eq("company_id", pulse.company_id)
      .eq("status", "active");
    if (error) {
      return { targetCount: 0, notificationsCreated: 0, emailsSent: 0, slackDMsSent: 0, slackPosted: false, error: error.message };
    }
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
    return { targetCount: 0, notificationsCreated: 0, emailsSent: 0, slackDMsSent: 0, slackPosted: false };
  }

  // Empresa: nome (para copy) + canal Slack (metadata.slack_pulse_channel_id)
  const { data: company } = await supabase
    .from("companies")
    .select("name, metadata")
    .eq("id", pulse.company_id)
    .maybeSingle();

  const companyName = (company?.name as string | undefined) ?? "oxypeople";
  const metadata = (company?.metadata ?? {}) as Record<string, unknown>;
  const slackChannel =
    (metadata.slack_pulse_channel_id as string | undefined) ??
    Deno.env.get("PULSE_SLACK_CHANNEL_ID") ??
    null;
  const appUrl = Deno.env.get("APP_BASE_URL") ?? null;

  const copy = buildPulseCopy({
    name: pulse.name,
    question: pulse.question,
    question_type: pulse.question_type,
    companyName,
    appUrl,
  });

  // 1. Notificações in-app (canal principal, mantém contrato existente)
  let created = 0;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    const rows = batch.map((userId) => ({
      user_id: userId,
      company_id: pulse.company_id,
      type: "pulse_request",
      title: copy.title,
      message: copy.message,
      reference_id: pulse.id,
      reference_type: "pulse_survey",
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) {
      return {
        targetCount: userIds.length,
        notificationsCreated: created,
        emailsSent: 0,
        slackDMsSent: 0,
        slackPosted: false,
        error: error.message,
      };
    }
    created += batch.length;
  }

  // 2. E-mail (best-effort) — busca e-mail/nome dos alvos em lotes
  const emailTargets: EmailTarget[] = [];
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("email, full_name")
      .in("id", batch);
    if (usersError) {
      log("warn", "pulse-dispatch:users-fetch-failed", { pulseId: pulse.id, error: usersError.message });
      break;
    }
    (usersData ?? []).forEach((u: { email: string | null; full_name: string | null }) => {
      if (u.email) emailTargets.push({ email: u.email, fullName: u.full_name });
    });
  }
  const emailsSent = await sendPulseEmails(emailTargets, copy.emailSubject, copy.emailHtml, log);

  // 3. Slack DM individual (best-effort) — lookup por e-mail + mensagem direta
  const slackDMsSent = await sendPulseSlackDMs(emailTargets, copy.slackText, log);

  // 4. Slack canal (best-effort) — 1 post no canal da empresa
  const slackPosted = await postPulseSlackChannel(slackChannel, copy.slackText, log);

  await supabase
    .from("pulse_surveys")
    .update({ last_dispatched_at: new Date().toISOString() })
    .eq("id", pulse.id);

  return { targetCount: userIds.length, notificationsCreated: created, emailsSent, slackDMsSent, slackPosted };
}
