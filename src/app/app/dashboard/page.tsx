import Link from "next/link";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { formatDate, relationValue, riskClass } from "@/app/app/_components/format";
import { canRunMissions, roleLabel } from "@/app/app/_components/permissions";
import { MissionSimulation } from "./MissionSimulation";

export default async function DashboardPage() {
  const { supabase, user, profile } = await getAuthedContext("/app/dashboard");

  const [
    siteResult,
    droneResult,
    activeMissionResult,
    alertsResult,
    readingsResult,
    missionsResult,
    reportsResult,
    zonesResult,
    sensorsResult,
  ] = await Promise.all([
    supabase.from("mine_sites").select("id, name, region, country, status").eq("name", "Operation MOLE Demo Mine").maybeSingle(),
    supabase
      .from("drones")
      .select("id, name, drone_code, status, battery_percent, signal_percent, battery_health, maintenance_required, preflight_passed_at")
      .eq("drone_code", "MOLE-01")
      .maybeSingle(),
    supabase
      .from("missions")
      .select("id, mission_code, title, status, risk_level, progress_percent, started_at")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("alerts")
      .select("id, title, description, risk_level, status, created_at, mine_zones(code, name)")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("sensor_readings")
      .select("id, reading_value, unit, risk_level, recorded_at, drone_sensors(label), mine_zones(code)")
      .order("recorded_at", { ascending: false })
      .limit(8),
    supabase
      .from("missions")
      .select("id, mission_code, title, status, risk_level, progress_percent, started_at, completed_at")
      .order("started_at", { ascending: false })
      .limit(4),
    supabase
      .from("reports")
      .select("id, title, summary, generated_at")
      .order("generated_at", { ascending: false })
      .limit(2),
    supabase
      .from("mine_zones")
      .select("id, code, name, status")
      .order("code", { ascending: true }),
    supabase
      .from("drone_sensors")
      .select("id, sensor_key, label, unit, status, last_diagnostic_result, next_calibration_due_at, required_for_mission")
      .order("sensor_key", { ascending: true }),
  ]);

  const databaseError =
    siteResult.error ||
    droneResult.error ||
    activeMissionResult.error ||
    alertsResult.error ||
    readingsResult.error ||
    missionsResult.error ||
    reportsResult.error ||
    zonesResult.error ||
    sensorsResult.error;

  const site = siteResult.data;
  const drone = droneResult.data;
  const activeMission = activeMissionResult.data;
  const alerts = alertsResult.data ?? [];
  const readings = readingsResult.data ?? [];
  const missions = missionsResult.data ?? [];
  const reports = reportsResult.data ?? [];
  const zones = zonesResult.data ?? [];
  const sensors = sensorsResult.data ?? [];
  const now = new Date();
  const launchBlockedReasons = [
    ...(drone?.status === "offline" ? ["drone is offline"] : []),
    ...(drone?.maintenance_required ? ["maintenance is required"] : []),
    ...((drone?.battery_health ?? 100) < 70 ? ["battery health is below minimum"] : []),
    ...(!drone?.preflight_passed_at ? ["pre-flight check has not passed"] : []),
    ...sensors
      .filter((sensor) => sensor.required_for_mission && (sensor.status === "failed" || sensor.last_diagnostic_result === "failed"))
      .map((sensor) => `${sensor.label} has failed`),
    ...sensors
      .filter((sensor) => sensor.required_for_mission && sensor.next_calibration_due_at && new Date(sensor.next_calibration_due_at) < now)
      .map((sensor) => `${sensor.label} calibration has expired`),
  ];

  return (
    <AppShell
      title="Operator dashboard"
      eyebrow="Operation MOLE"
      userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`}
      role={profile?.role}
    >
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {databaseError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">
            <p className="font-black">Database error</p>
            <p className="mt-2 text-sm">{databaseError.message}</p>
          </div>
        ) : !site || !drone ? (
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="font-black">No operational data yet</p>
            <p className="mt-2 text-sm text-stone-600">Run the Operation MOLE seed migration to populate the demo mine.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {canRunMissions(profile?.role) ? (
              <MissionSimulation
                userId={user.id}
                mineSiteId={site.id}
                droneId={drone.id}
                zones={zones}
                sensors={sensors}
                launchBlockedReasons={launchBlockedReasons}
              />
            ) : (
              <article className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-800">
                <p className="font-black">Read-only operational view</p>
                <p className="mt-2 text-sm">Your role can review missions, alerts, and reports, but cannot start MOLE-01 mission runs.</p>
              </article>
            )}

            <div className="grid gap-4 lg:grid-cols-4">
              <article className="rounded-lg border border-stone-200 bg-white p-5 lg:col-span-2">
                <p className="text-sm font-bold text-stone-500">Mine site</p>
                <h2 className="mt-2 text-3xl font-black">{site.name}</h2>
                <p className="mt-1 text-sm text-stone-600">
                  {site.region}, {site.country}
                </p>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Drone status</p>
                <p className="mt-2 text-3xl font-black text-emerald-700">{drone.status}</p>
                <p className="mt-1 text-sm text-stone-600">{drone.drone_code}</p>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Telemetry</p>
                <p className="mt-2 text-3xl font-black">{drone.battery_percent}%</p>
                <p className="mt-1 text-sm text-stone-600">Signal {drone.signal_percent}%</p>
              </article>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-stone-500">Active mission</p>
                    <h2 className="mt-2 text-2xl font-black">{activeMission?.title ?? "No active mission"}</h2>
                    <p className="mt-1 text-sm text-stone-600">
                      {activeMission ? `${activeMission.mission_code} started ${formatDate(activeMission.started_at)}` : "All missions are currently complete."}
                    </p>
                  </div>
                  {activeMission?.risk_level ? (
                    <span className={`w-fit rounded-md border px-3 py-1 text-sm font-bold ${riskClass(activeMission.risk_level)}`}>
                      {activeMission.risk_level}
                    </span>
                  ) : null}
                </div>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${activeMission?.progress_percent ?? 0}%` }} />
                </div>
                <p className="mt-2 text-sm font-bold text-stone-600">{activeMission?.progress_percent ?? 0}% complete</p>
              </article>

              <article className="rounded-lg border border-stone-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-stone-500">Recent alerts</p>
                    <Link className="text-sm font-bold text-emerald-700" href="/app/alerts">
                      Manage all
                    </Link>
                  </div>
                <div className="mt-4 space-y-3">
                  {alerts.length === 0 ? (
                    <p className="text-sm text-stone-600">No alerts found.</p>
                  ) : (
                    alerts.map((alert) => (
                      <div key={alert.id} className="border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-bold">{alert.title}</p>
                          <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${riskClass(alert.risk_level)}`}>{alert.risk_level}</span>
                        </div>
                        <p className="mt-1 text-sm text-stone-600">
                          {relationValue(alert.mine_zones, "code")} · {alert.status} · {formatDate(alert.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <article className="rounded-lg border border-stone-200 bg-white p-5 lg:col-span-2">
                <p className="text-sm font-bold text-stone-500">Latest sensor readings</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {readings.length === 0 ? (
                    <p className="text-sm text-stone-600">No sensor readings found.</p>
                  ) : (
                    readings.map((reading) => (
                      <div key={reading.id} className="rounded-md border border-stone-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-bold">{relationValue(reading.drone_sensors, "label")}</p>
                          <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${riskClass(reading.risk_level)}`}>{reading.risk_level}</span>
                        </div>
                        <p className="mt-2 text-2xl font-black">
                          {Number(reading.reading_value).toLocaleString()} {reading.unit}
                        </p>
                        <p className="mt-1 text-sm text-stone-600">
                          {relationValue(reading.mine_zones, "code")} · {formatDate(reading.recorded_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-stone-500">Recent reports</p>
                  <Link className="text-sm font-bold text-emerald-700" href="/app/reports">
                    View all
                  </Link>
                </div>
                <div className="mt-4 space-y-4">
                  {reports.length === 0 ? (
                    <p className="text-sm text-stone-600">No reports found.</p>
                  ) : (
                    reports.map((report) => (
                      <div key={report.id}>
                        <p className="font-bold">{report.title}</p>
                        <p className="mt-1 text-sm text-stone-600">{report.summary}</p>
                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">{formatDate(report.generated_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>

            <article className="rounded-lg border border-stone-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-stone-500">Recent missions</p>
                <Link className="text-sm font-bold text-emerald-700" href="/app/missions">
                  View all
                </Link>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-stone-200 text-stone-500">
                    <tr>
                      <th className="py-2 pr-4">Code</th>
                      <th className="py-2 pr-4">Mission</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Risk</th>
                      <th className="py-2 pr-4">Progress</th>
                      <th className="py-2">Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missions.map((mission) => (
                      <tr key={mission.id} className="border-b border-stone-100 last:border-0">
                        <td className="py-3 pr-4 font-bold">{mission.mission_code}</td>
                        <td className="py-3 pr-4">{mission.title}</td>
                        <td className="py-3 pr-4">{mission.status}</td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${riskClass(mission.risk_level)}`}>{mission.risk_level}</span>
                        </td>
                        <td className="py-3 pr-4">{mission.progress_percent}%</td>
                        <td className="py-3">{formatDate(mission.started_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        )}
      </section>
    </AppShell>
  );
}
