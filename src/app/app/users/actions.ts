"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageUsers } from "@/app/app/_components/permissions";
import { createClient } from "@/lib/supabase/server";

const roles = ["administrator", "mine_operator", "safety_officer", "drone_operator", "viewer", "regulator"];
const statuses = ["active", "suspended", "inactive"];

export async function updateUserProfile(formData: FormData) {
  const targetUser = String(formData.get("targetUser") ?? "");
  const role = String(formData.get("role") ?? "");
  const accountStatus = String(formData.get("accountStatus") ?? "");
  const mineSiteId = String(formData.get("mineSiteId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const organization = String(formData.get("organization") ?? "").trim();

  if (!targetUser || !roles.includes(role) || !statuses.includes(accountStatus) || !fullName) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/users");

  const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!canManageUsers(adminProfile?.role)) return;

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id, role, account_status, mine_site_id, full_name, organization")
    .eq("id", targetUser)
    .maybeSingle();
  if (!targetProfile) return;

  const { count: activeAdmins } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "administrator")
    .eq("account_status", "active");

  const isLastActiveAdmin =
    targetProfile.role === "administrator" &&
    targetProfile.account_status === "active" &&
    (activeAdmins ?? 0) <= 1;

  if (isLastActiveAdmin && (role !== "administrator" || accountStatus !== "active")) return;
  if (targetUser === user.id && role !== "administrator") return;
  if (targetUser === user.id && accountStatus !== "active") return;

  if (mineSiteId) {
    const { data: site } = await supabase.from("mine_sites").select("id").eq("id", mineSiteId).maybeSingle();
    if (!site) return;
  }

  const nextValue = {
    role,
    account_status: accountStatus,
    mine_site_id: mineSiteId || null,
    full_name: fullName,
    organization,
  };

  await supabase
    .from("profiles")
    .update(nextValue)
    .eq("id", targetUser);

  await supabase.from("audit_logs").insert({
    target_user: targetUser,
    previous_value: targetProfile,
    new_value: nextValue,
    administrator: user.id,
    action_type: "profile_admin_update",
  });

  revalidatePath("/app/users");
  revalidatePath("/app/dashboard");
}
