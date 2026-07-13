"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canRunMissions } from "@/app/app/_components/permissions";
import { createClient } from "@/lib/supabase/server";

const controlConfig: Record<string, { status: "active" | "paused" | "cancelled" | "completed"; eventType: string; summary: string }> = {
  pause: { status: "paused", eventType: "mission_paused", summary: "Mission paused from live telemetry." },
  resume: { status: "active", eventType: "mission_resumed", summary: "Mission resumed from live telemetry." },
  return_to_base: { status: "active", eventType: "return_to_base", summary: "MOLE-01 return-to-base command issued." },
  emergency_recall: { status: "cancelled", eventType: "emergency_recall", summary: "Emergency recall issued from live telemetry." },
};

export async function controlMission(formData: FormData) {
  const missionId = String(formData.get("missionId") ?? "");
  const action = String(formData.get("action") ?? "");
  const config = controlConfig[action];
  if (!missionId || !config) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/app/live-mission/${missionId}`);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!canRunMissions(profile?.role)) return;

  const { data: mission } = await supabase.from("missions").select("id, status, progress_percent").eq("id", missionId).maybeSingle();
  if (!mission) return;

  await supabase
    .from("missions")
    .update({
      status: config.status,
      completed_at: config.status === "cancelled" || config.status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", missionId);

  await supabase.from("mission_events").insert({
    mission_id: missionId,
    event_type: config.eventType,
    summary: config.summary,
    metadata: { action, previous_status: mission.status, next_status: config.status },
    created_by: user.id,
  });

  revalidatePath(`/app/live-mission/${missionId}`);
  revalidatePath("/app/dashboard");
  revalidatePath("/app/missions");
}
