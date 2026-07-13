"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageSettings } from "@/app/app/_components/permissions";
import { createClient } from "@/lib/supabase/server";

export async function saveThreshold(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/settings");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!canManageSettings(profile?.role)) return;

  const id = String(formData.get("id") ?? "");
  const settingKey = String(formData.get("settingKey") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const value = Number(formData.get("value"));
  const unit = String(formData.get("unit") ?? "").trim();
  const severityLevel = String(formData.get("severityLevel") ?? "medium");
  const sensorKey = String(formData.get("sensorKey") ?? "").trim();
  const comparison = String(formData.get("comparison") ?? "gt");

  if (!settingKey || !displayName || !unit || !sensorKey || Number.isNaN(value)) return;
  if (value < 0) return;
  if (sensorKey === "oxygen" && (value < 0 || value > 25)) return;
  if ((sensorKey === "battery" || sensorKey === "radio_signal") && (value < 0 || value > 100)) return;

  const payload = {
    setting_key: settingKey,
    description: String(formData.get("description") ?? "").trim(),
    updated_by: user.id,
    setting_value: {
      display_name: displayName,
      value,
      unit,
      severity_level: severityLevel,
      sensor_key: sensorKey,
      comparison,
    },
  };

  if (id) {
    await supabase.from("system_settings").update(payload).eq("id", id);
  } else {
    await supabase.from("system_settings").insert(payload);
  }
  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
}
