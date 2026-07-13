"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageDroneMaintenance } from "@/app/app/_components/permissions";
import { createClient } from "@/lib/supabase/server";

async function requireDroneManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/drone");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!canManageDroneMaintenance(profile?.role)) return null;
  return { supabase, user };
}

async function auditChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  actionType: string,
  previousValue: unknown,
  newValue: unknown,
) {
  await supabase.from("audit_logs").insert({
    administrator: userId,
    action_type: actionType,
    previous_value: previousValue,
    new_value: newValue,
  });
}

export async function runDiagnostic(formData: FormData) {
  const context = await requireDroneManager();
  if (!context) return;
  const { supabase, user } = context;
  const droneId = String(formData.get("droneId") ?? "");
  const failSensorId = String(formData.get("failSensorId") ?? "");
  if (!droneId) return;

  const { data: drone } = await supabase.from("drones").select("*").eq("id", droneId).maybeSingle();
  if (!drone) return;

  const result = failSensorId ? "failed" : "passed";
  await supabase.from("diagnostic_runs").insert({
    drone_id: droneId,
    sensor_id: failSensorId || null,
    run_by: user.id,
    diagnostic_type: failSensorId ? "sensor_fault_injection" : "full_preflight",
    result,
    notes: failSensorId ? "Sensor diagnostic failed during verification." : "All required diagnostics passed.",
  });

  if (failSensorId) {
    const { data: sensor } = await supabase.from("drone_sensors").select("*").eq("id", failSensorId).maybeSingle();
    await supabase.from("drone_sensors").update({ status: "failed", last_diagnostic_result: "failed" }).eq("id", failSensorId);
    await supabase.from("drones").update({ status: "maintenance", maintenance_required: true, last_diagnostic_result: "failed" }).eq("id", droneId);
    await auditChange(supabase, user.id, "drone_sensor_diagnostic_failed", sensor, { sensor_id: failSensorId, status: "failed" });
  } else {
    await supabase.from("drone_sensors").update({ last_diagnostic_result: "passed" }).eq("drone_id", droneId).neq("status", "failed");
    await supabase
      .from("drones")
      .update({ status: "available", maintenance_required: false, preflight_passed_at: new Date().toISOString(), last_diagnostic_result: "passed" })
      .eq("id", droneId);
    await auditChange(supabase, user.id, "drone_diagnostic_passed", drone, { drone_id: droneId, last_diagnostic_result: "passed" });
  }

  revalidatePath("/app/drone");
  revalidatePath("/app/dashboard");
}

export async function recordMaintenance(formData: FormData) {
  const context = await requireDroneManager();
  if (!context) return;
  const { supabase, user } = context;
  const droneId = String(formData.get("droneId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!droneId) return;

  const { data: drone } = await supabase.from("drones").select("*").eq("id", droneId).maybeSingle();
  if (!drone) return;
  const nextDue = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from("maintenance_records").insert({
    drone_id: droneId,
    performed_by: user.id,
    maintenance_type: "preventive_service",
    notes: notes || "Preventive maintenance completed.",
    status: "completed",
    next_due_at: nextDue,
  });

  await supabase
    .from("drones")
    .update({
      status: "available",
      maintenance_required: false,
      last_maintenance_at: new Date().toISOString(),
      next_maintenance_due_at: nextDue,
      last_diagnostic_result: "passed",
    })
    .eq("id", droneId);

  await auditChange(supabase, user.id, "drone_maintenance_recorded", drone, { drone_id: droneId, next_maintenance_due_at: nextDue });
  revalidatePath("/app/drone");
  revalidatePath("/app/dashboard");
}

export async function markMaintenanceRequired(formData: FormData) {
  const context = await requireDroneManager();
  if (!context) return;
  const { supabase, user } = context;
  const droneId = String(formData.get("droneId") ?? "");
  if (!droneId) return;
  const { data: drone } = await supabase.from("drones").select("*").eq("id", droneId).maybeSingle();
  if (!drone) return;

  await supabase.from("drones").update({ status: "maintenance", maintenance_required: true }).eq("id", droneId);
  await auditChange(supabase, user.id, "drone_maintenance_required", drone, { drone_id: droneId, maintenance_required: true });
  revalidatePath("/app/drone");
  revalidatePath("/app/dashboard");
}

export async function updateFirmware(formData: FormData) {
  const context = await requireDroneManager();
  if (!context) return;
  const { supabase, user } = context;
  const droneId = String(formData.get("droneId") ?? "");
  const firmwareVersion = String(formData.get("firmwareVersion") ?? "").trim();
  if (!droneId || !firmwareVersion) return;
  const { data: drone } = await supabase.from("drones").select("*").eq("id", droneId).maybeSingle();
  if (!drone) return;

  await supabase.from("drones").update({ firmware_version: firmwareVersion }).eq("id", droneId);
  await auditChange(supabase, user.id, "drone_firmware_updated", drone, { drone_id: droneId, firmware_version: firmwareVersion });
  revalidatePath("/app/drone");
}

export async function recordSensorCalibration(formData: FormData) {
  const context = await requireDroneManager();
  if (!context) return;
  const { supabase, user } = context;
  const sensorId = String(formData.get("sensorId") ?? "");
  if (!sensorId) return;
  const { data: sensor } = await supabase.from("drone_sensors").select("*").eq("id", sensorId).maybeSingle();
  if (!sensor) return;

  const nextCalibration = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("drone_sensors")
    .update({
      status: "online",
      last_calibration_at: new Date().toISOString(),
      next_calibration_due_at: nextCalibration,
      last_diagnostic_result: "passed",
    })
    .eq("id", sensorId);
  await auditChange(supabase, user.id, "sensor_calibration_recorded", sensor, { sensor_id: sensorId, next_calibration_due_at: nextCalibration });
  revalidatePath("/app/drone");
  revalidatePath("/app/dashboard");
}

export async function returnDroneToService(formData: FormData) {
  const context = await requireDroneManager();
  if (!context) return;
  const { supabase, user } = context;
  const droneId = String(formData.get("droneId") ?? "");
  if (!droneId) return;
  const { data: drone } = await supabase.from("drones").select("*").eq("id", droneId).maybeSingle();
  if (!drone) return;

  await supabase.from("drone_sensors").update({ status: "online", last_diagnostic_result: "passed" }).eq("drone_id", droneId);
  await supabase
    .from("drones")
    .update({ status: "available", maintenance_required: false, preflight_passed_at: new Date().toISOString(), last_diagnostic_result: "passed" })
    .eq("id", droneId);
  await auditChange(supabase, user.id, "drone_returned_to_service", drone, { drone_id: droneId, status: "available" });
  revalidatePath("/app/drone");
  revalidatePath("/app/dashboard");
}
