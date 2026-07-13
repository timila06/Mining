"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageSettings } from "@/app/app/_components/permissions";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin(next: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!canManageSettings(profile?.role)) return { supabase: null, user: null };
  return { supabase, user };
}

export async function saveMineSite(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    region: String(formData.get("region") ?? "").trim(),
    country: String(formData.get("country") ?? "Thailand").trim(),
    mine_type: String(formData.get("mineType") ?? "underground").trim(),
    status: String(formData.get("status") ?? "unknown"),
    location: String(formData.get("location") ?? "").trim(),
    operator_name: String(formData.get("operatorName") ?? "").trim(),
    emergency_contact: String(formData.get("emergencyContact") ?? "").trim(),
    base_station_info: String(formData.get("baseStationInfo") ?? "").trim(),
  };

  if (!payload.name || !payload.region || !payload.country) return;
  const { supabase } = await requireAdmin("/app/sites");
  if (!supabase) return;

  if (id) {
    await supabase.from("mine_sites").update(payload).eq("id", id);
  } else {
    await supabase.from("mine_sites").insert(payload);
  }
  revalidatePath("/app/sites");
  if (id) revalidatePath(`/app/sites/${id}`);
}

export async function saveMineZone(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const mineSiteId = String(formData.get("mineSiteId") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const x = Number(formData.get("x") ?? 0);
  const y = Number(formData.get("y") ?? 0);
  const z = Number(formData.get("z") ?? 0);
  const payload = {
    mine_site_id: mineSiteId,
    code,
    name: String(formData.get("name") ?? "").trim(),
    level: String(formData.get("level") ?? "").trim(),
    status: String(formData.get("status") ?? "unknown"),
    restricted: formData.get("restricted") === "on",
    map_coordinates: { x, y, z },
  };

  if (!mineSiteId || !payload.code || !payload.name) return;
  const { supabase } = await requireAdmin(`/app/sites/${mineSiteId}`);
  if (!supabase) return;

  if (id) {
    await supabase.from("mine_zones").update(payload).eq("id", id);
  } else {
    const { data: duplicate } = await supabase
      .from("mine_zones")
      .select("id")
      .eq("mine_site_id", mineSiteId)
      .eq("code", code)
      .maybeSingle();
    if (duplicate) return;
    await supabase.from("mine_zones").insert(payload);
  }
  revalidatePath(`/app/sites/${mineSiteId}`);
}
