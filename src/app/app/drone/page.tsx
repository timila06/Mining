import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { formatDate, relationValue, riskClass } from "@/app/app/_components/format";
import { canManageDroneMaintenance, roleLabel } from "@/app/app/_components/permissions";
import { markMaintenanceRequired, recordMaintenance, recordSensorCalibration, returnDroneToService, runDiagnostic, updateFirmware } from "./actions";

function statusClass(status?: string | null) {
  if (status === "available" || status === "online" || status === "passed") return riskClass("low");
  if (status === "failed" || status === "maintenance" || status === "offline") return riskClass("critical");
  return riskClass("medium");
}

function calibrationStatus(nextCalibration: string | null | undefined, now: Date) {
  if (!nextCalibration) return "Not scheduled";
  return new Date(nextCalibration) < now ? "Expired" : formatDate(nextCalibration);
}

export default async function DronePage() {
  const { supabase, user, profile } = await getAuthedContext("/app/drone");
  const canManage = canManageDroneMaintenance(profile?.role);

  const [droneResult, sensorsResult, maintenanceResult, diagnosticResult, auditResult] = await Promise.all([
    supabase
      .from("drones")
      .select("*, mine_sites(name)")
      .eq("drone_code", "MOLE-01")
      .maybeSingle(),
    supabase
      .from("drone_sensors")
      .select("id, drone_id, sensor_key, label, sensor_type, unit, status, last_calibration_at, next_calibration_due_at, last_diagnostic_result, required_for_mission")
      .order("label"),
    supabase
      .from("maintenance_records")
      .select("id, maintenance_type, notes, status, performed_at, next_due_at, profiles(full_name)")
      .order("performed_at", { ascending: false })
      .limit(8),
    supabase
      .from("diagnostic_runs")
      .select("id, diagnostic_type, result, notes, created_at, drone_sensors(label), profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("audit_logs")
      .select("id, action_type, created_at, profiles!audit_logs_administrator_fkey(full_name)")
      .like("action_type", "drone_%")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const databaseError = droneResult.error || sensorsResult.error || maintenanceResult.error || diagnosticResult.error || auditResult.error;
  const drone = droneResult.data;
  const sensors = sensorsResult.data ?? [];
  const maintenanceRecords = maintenanceResult.data ?? [];
  const diagnosticRuns = diagnosticResult.data ?? [];
  const auditRows = auditResult.data ?? [];
  const now = new Date();
  const failedSensors = sensors.filter((sensor) => sensor.status === "failed" || sensor.last_diagnostic_result === "failed");
  const expiredCalibrations = sensors.filter((sensor) => sensor.required_for_mission && sensor.next_calibration_due_at && new Date(sensor.next_calibration_due_at) < now);
  const activeWarnings = [
    ...(drone?.status === "offline" ? ["Drone is offline"] : []),
    ...(drone?.maintenance_required ? ["Maintenance required"] : []),
    ...((drone?.battery_health ?? 100) < 70 ? ["Battery health below minimum"] : []),
    ...failedSensors.map((sensor) => `${sensor.label} diagnostic failed`),
    ...expiredCalibrations.map((sensor) => `${sensor.label} calibration expired`),
    ...(!drone?.preflight_passed_at ? ["Pre-flight check has not passed"] : []),
  ];

  return (
    <AppShell title="MOLE-01 drone management" eyebrow="Operation MOLE" userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`} role={profile?.role}>
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {databaseError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">{databaseError.message}</div>
        ) : !drone ? (
          <div className="rounded-lg border border-stone-200 bg-white p-5">MOLE-01 has not been seeded yet.</div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-4">
              <article className="rounded-lg border border-stone-200 bg-white p-5 lg:col-span-2">
                <p className="text-sm font-bold text-stone-500">MOLE-01 overview</p>
                <h2 className="mt-2 text-3xl font-black">{drone.name}</h2>
                <p className="mt-1 text-sm text-stone-600">
                  {drone.drone_code} - {drone.model} - {relationValue(drone.mine_sites, "name")}
                </p>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <p><span className="font-bold">Firmware:</span> {drone.firmware_version ?? "Unknown"}</p>
                  <p><span className="font-bold">Flight hours:</span> {Number(drone.total_flight_hours ?? 0).toLocaleString()}</p>
                  <p><span className="font-bold">Last mission:</span> {formatDate(drone.last_mission_at)}</p>
                </div>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Battery health</p>
                <p className="mt-2 text-3xl font-black">{drone.battery_percent}%</p>
                <p className="mt-1 text-sm text-stone-600">Cell health {drone.battery_health}%</p>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Communication</p>
                <p className="mt-2 text-3xl font-black">{drone.signal_percent}%</p>
                <span className={`mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-bold ${statusClass(drone.status)}`}>{drone.status}</span>
              </article>
            </div>

            <article className={`rounded-lg border p-5 ${activeWarnings.length ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
              <p className="font-black">{activeWarnings.length ? "Active faults and warnings" : "Mission launch available"}</p>
              <p className="mt-2 text-sm">
                {activeWarnings.length ? activeWarnings.join("; ") : "MOLE-01 has passed diagnostics, calibration, maintenance, and pre-flight requirements."}
              </p>
            </article>

            <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Attached sensors</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b border-stone-200 text-stone-500">
                      <tr><th className="py-2 pr-4">Sensor</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Calibration</th><th className="py-2">Action</th></tr>
                    </thead>
                    <tbody>
                      {sensors.map((sensor) => (
                        <tr key={sensor.id} className="border-b border-stone-100 last:border-0">
                          <td className="py-3 pr-4 font-bold">{sensor.label} ({sensor.unit})</td>
                          <td className="py-3 pr-4">{sensor.sensor_type}</td>
                          <td className="py-3 pr-4"><span className={`rounded-md border px-2 py-1 text-xs font-bold ${statusClass(sensor.status)}`}>{sensor.status} / {sensor.last_diagnostic_result}</span></td>
                          <td className="py-3 pr-4">{calibrationStatus(sensor.next_calibration_due_at, now)}</td>
                          <td className="py-3">
                            {canManage ? (
                              <form action={recordSensorCalibration}>
                                <input type="hidden" name="sensorId" value={sensor.id} />
                                <button className="rounded-md border border-stone-300 px-3 py-2 text-xs font-bold">Record calibration</button>
                              </form>
                            ) : "Read-only"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Pre-flight diagnostic checklist</p>
                <div className="mt-4 space-y-3 text-sm">
                  <p>Status: <span className="font-bold">{drone.last_diagnostic_result}</span></p>
                  <p>Pre-flight passed: <span className="font-bold">{formatDate(drone.preflight_passed_at)}</span></p>
                  <p>Last maintenance: <span className="font-bold">{formatDate(drone.last_maintenance_at)}</span></p>
                  <p>Next maintenance: <span className="font-bold">{formatDate(drone.next_maintenance_due_at)}</span></p>
                </div>
                {canManage ? (
                  <div className="mt-5 space-y-3">
                    <form action={runDiagnostic}>
                      <input type="hidden" name="droneId" value={drone.id} />
                      <button className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Run Diagnostic</button>
                    </form>
                    <form action={runDiagnostic} className="flex flex-col gap-2 sm:flex-row">
                      <input type="hidden" name="droneId" value={drone.id} />
                      <select name="failSensorId" className="rounded-md border border-stone-300 px-3 py-2 text-sm">
                        {sensors.map((sensor) => <option key={sensor.id} value={sensor.id}>{sensor.label}</option>)}
                      </select>
                      <button className="rounded-md border border-red-300 px-4 py-2 text-sm font-bold text-red-700">Fail sensor diagnostic</button>
                    </form>
                    <form action={markMaintenanceRequired}>
                      <input type="hidden" name="droneId" value={drone.id} />
                      <button className="rounded-md border border-amber-300 px-4 py-2 text-sm font-bold text-amber-800">Mark Maintenance Required</button>
                    </form>
                    <form action={returnDroneToService}>
                      <input type="hidden" name="droneId" value={drone.id} />
                      <button className="rounded-md border border-stone-300 px-4 py-2 text-sm font-bold">Return Drone to Service</button>
                    </form>
                  </div>
                ) : null}
              </article>
            </div>

            {canManage ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <form action={recordMaintenance} className="rounded-lg border border-stone-200 bg-white p-5">
                  <p className="text-sm font-bold text-stone-500">Record Maintenance</p>
                  <input type="hidden" name="droneId" value={drone.id} />
                  <textarea name="notes" placeholder="Maintenance notes" className="mt-4 min-h-24 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
                  <button className="mt-3 rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Record Maintenance</button>
                </form>
                <form action={updateFirmware} className="rounded-lg border border-stone-200 bg-white p-5">
                  <p className="text-sm font-bold text-stone-500">Update Firmware Version</p>
                  <input type="hidden" name="droneId" value={drone.id} />
                  <input name="firmwareVersion" defaultValue={drone.firmware_version ?? ""} className="mt-4 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
                  <button className="mt-3 rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Update Firmware Version</button>
                </form>
              </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-3">
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Maintenance history</p>
                <div className="mt-4 space-y-3 text-sm">
                  {maintenanceRecords.map((record) => (
                    <div key={record.id} className="border-b border-stone-100 pb-3 last:border-0">
                      <p className="font-bold">{record.maintenance_type} - {record.status}</p>
                      <p className="text-stone-600">{record.notes ?? "No notes"} - {formatDate(record.performed_at)}</p>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Diagnostic runs</p>
                <div className="mt-4 space-y-3 text-sm">
                  {diagnosticRuns.map((run) => (
                    <div key={run.id} className="border-b border-stone-100 pb-3 last:border-0">
                      <p className="font-bold">{run.diagnostic_type} - {run.result}</p>
                      <p className="text-stone-600">{relationValue(run.drone_sensors, "label")} - {formatDate(run.created_at)}</p>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Recent drone audit</p>
                <div className="mt-4 space-y-3 text-sm">
                  {auditRows.map((audit) => (
                    <div key={audit.id} className="border-b border-stone-100 pb-3 last:border-0">
                      <p className="font-bold">{audit.action_type}</p>
                      <p className="text-stone-600">{relationValue(audit.profiles, "full_name")} - {formatDate(audit.created_at)}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
