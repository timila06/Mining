"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AlertStatus = "open" | "acknowledged" | "investigating" | "resolved" | "dismissed";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/alerts");
  }

  return { supabase, user };
}

export async function updateAlertStatus(formData: FormData) {
  const alertId = String(formData.get("alertId") ?? "");
  const nextStatus = String(formData.get("status") ?? "") as AlertStatus;
  const resolutionNote = String(formData.get("resolutionNote") ?? "");
  const correctiveAction = String(formData.get("correctiveAction") ?? "");

  if (!alertId || !["open", "acknowledged", "investigating", "resolved", "dismissed"].includes(nextStatus)) {
    return;
  }

  if ((nextStatus === "resolved" || nextStatus === "dismissed") && (!resolutionNote.trim() || !correctiveAction.trim())) {
    return;
  }

  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("alerts")
    .select("id, mission_id, status")
    .eq("id", alertId)
    .maybeSingle();

  if (!existing) return;

  const timestamp = new Date().toISOString();
  await supabase
    .from("alerts")
    .update({
      status: nextStatus,
      acknowledged_by: nextStatus === "acknowledged" ? user.id : undefined,
      acknowledged_at: nextStatus === "acknowledged" ? timestamp : undefined,
      assigned_to: nextStatus === "investigating" ? user.id : undefined,
      resolved_at: nextStatus === "resolved" ? timestamp : undefined,
      dismissed_at: nextStatus === "dismissed" ? timestamp : undefined,
      resolution_note: resolutionNote || undefined,
      corrective_action: correctiveAction || undefined,
    })
    .eq("id", alertId);

  if (existing.mission_id) {
    await supabase.from("mission_events").insert({
      mission_id: existing.mission_id,
      event_type: "alert_status_changed",
      summary: `Alert status changed from ${existing.status} to ${nextStatus}.`,
      metadata: {
        alert_id: alertId,
        previous_status: existing.status,
        new_status: nextStatus,
        user: user.id,
        resolution_note: resolutionNote || null,
        corrective_action: correctiveAction || null,
        timestamp,
      },
      created_by: user.id,
    });
  }

  revalidatePath("/app/dashboard");
  revalidatePath("/app/alerts");
  revalidatePath(`/app/alerts/${alertId}`);
}

export async function assignAlertToSelf(formData: FormData) {
  const alertId = String(formData.get("alertId") ?? "");
  if (!alertId) return;

  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("alerts")
    .select("id, mission_id, status")
    .eq("id", alertId)
    .maybeSingle();

  if (!existing) return;

  const timestamp = new Date().toISOString();
  await supabase
    .from("alerts")
    .update({ assigned_to: user.id, status: "investigating" })
    .eq("id", alertId);

  if (existing.mission_id) {
    await supabase.from("mission_events").insert({
      mission_id: existing.mission_id,
      event_type: "alert_assigned",
      summary: "Alert assigned to current operator.",
      metadata: {
        alert_id: alertId,
        previous_status: existing.status,
        new_status: "investigating",
        user: user.id,
        timestamp,
      },
      created_by: user.id,
    });
  }

  revalidatePath("/app/alerts");
  revalidatePath(`/app/alerts/${alertId}`);
}
