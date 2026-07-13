"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/notifications");
  return { supabase, user };
}

export async function markNotificationRead(formData: FormData) {
  const id = String(formData.get("notificationId") ?? "");
  if (!id) return;
  const { supabase, user } = await currentUser();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/notifications");
  revalidatePath("/app/dashboard");
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await currentUser();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/app/notifications");
  revalidatePath("/app/dashboard");
}

export async function updateNotificationPreferences(formData: FormData) {
  const { supabase, user } = await currentUser();
  await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    critical_alerts: formData.get("critical_alerts") === "on",
    dangerous_alerts: formData.get("dangerous_alerts") === "on",
    mission_status_changes: formData.get("mission_status_changes") === "on",
    safety_approvals: formData.get("safety_approvals") === "on",
    maintenance_warnings: formData.get("maintenance_warnings") === "on",
  });
  revalidatePath("/app/notifications");
}
