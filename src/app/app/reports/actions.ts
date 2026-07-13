"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canApproveSafety } from "@/app/app/_components/permissions";
import { createClient } from "@/lib/supabase/server";

const decisions = [
  "Safe to enter",
  "Conditional entry",
  "Restricted access",
  "Do not enter",
  "Emergency response required",
];

export async function submitSafetyApproval(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "");
  const missionId = String(formData.get("missionId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const comments = String(formData.get("comments") ?? "").trim();
  const correctiveActions = String(formData.get("correctiveActions") ?? "").trim();
  const conditions = String(formData.get("conditions") ?? "").trim();

  if (!reportId || !missionId || !decisions.includes(decision)) return;
  if (!comments) return;
  if (decision !== "Safe to enter" && !correctiveActions) return;
  if (decision === "Conditional entry" && !conditions) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/app/reports/${reportId}`);
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!canApproveSafety(profile?.role)) return;

  const { data: report } = await supabase
    .from("reports")
    .select("id, mission_id, title, missions(status)")
    .eq("id", reportId)
    .maybeSingle();

  const mission = Array.isArray(report?.missions) ? report?.missions[0] : report?.missions;
  if (!report || report.mission_id !== missionId || mission?.status === "active") return;

  const now = new Date().toISOString();
  const approvalPayload = {
    report_id: reportId,
    mission_id: missionId,
    reviewed_by: user.id,
    approved_by: user.id,
    status: decision === "Safe to enter" || decision === "Conditional entry" ? "approved" : "denied",
    decision,
    comments,
    corrective_actions: correctiveActions,
    conditions,
    decision_notes: comments,
    approved_at: now,
  };

  const { data: existingApproval } = await supabase
    .from("safety_approvals")
    .select("id")
    .eq("report_id", reportId)
    .maybeSingle();

  const approvalResult = existingApproval
    ? await supabase.from("safety_approvals").update(approvalPayload).eq("id", existingApproval.id)
    : await supabase.from("safety_approvals").insert(approvalPayload);

  if (approvalResult.error) {
    console.error("Safety approval save failed", approvalResult.error.message);
    return;
  }

  await supabase
    .from("reports")
    .update({
      final_entry_decision: decision,
      recommendations: correctiveActions || conditions || comments,
      report_status: "reviewed",
    })
    .eq("id", reportId);

  await supabase.from("mission_events").insert({
    mission_id: missionId,
    event_type: "safety_approval_submitted",
    summary: `Final entry decision set to ${decision}.`,
    metadata: {
      report_id: reportId,
      decision,
      comments,
      corrective_actions: correctiveActions,
      conditions,
      reviewed_by: user.id,
      timestamp: now,
    },
    created_by: user.id,
  });

  revalidatePath(`/app/reports/${reportId}`);
  revalidatePath(`/app/missions/${missionId}`);
  revalidatePath("/app/reports");
  revalidatePath("/app/missions");
}
