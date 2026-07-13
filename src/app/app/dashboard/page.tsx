import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { MissionSimulation } from "./MissionSimulation";

type RiskLevel = "low" | "medium" | "high" | "critical" | "resolved";

const riskStyles: Record<RiskLevel, string> = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  high: "bg-orange-50 text-orange-800 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
  resolved: "bg-stone-50 text-stone-600 border-stone-200",
};

function formatDate(value: string | null) {
  if (!value) return "Not started";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function riskClass(level?: string | null) {
  return riskStyles[(level as RiskLevel) ?? "low"] ?? riskStyles.low;
}

function relationValue<T extends Record<string, unknown>>(relation: T | T[] | null | undefined, key: keyof T) {
  const item = Array.isArray(relation) ? relation[0] : relation;
  return item?.[key] ? String(item[key]) : "Unknown";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, organization")
    .eq("id", user.id)
    .maybeSingle();

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
    supabase.from("drones").select("id, name, drone_code, status, battery_percent, signal_percent").eq("drone_code", "MOLE-01").maybeSingle(),
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
      .select("id, sensor_key, label, unit")
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

  return (
    <main className="min-h-screen bg-[#f5f3ee] text-stone-950">
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Operation MOLE</p>
            <h1 className="text-2xl font-black">Operator dashboard</h1>
            <p className="text-sm text-stone-600">
              Signed in as {profile?.full_name ?? user.email} {profile?.role ? `(${profile.role})` : ""}
            </p>
          </div>
          <form action={signOut}>
            <button className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50">
              Logout
            </button>
          </form>
        </div>
      </nav>

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
            <MissionSimulation
              userId={user.id}
              mineSiteId={site.id}
              droneId={drone.id}
              zones={zones}
              sensors={sensors}
            />

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
                <p className="text-sm font-bold text-stone-500">Recent alerts</p>
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
                <p className="text-sm font-bold text-stone-500">Recent reports</p>
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
              <p className="text-sm font-bold text-stone-500">Recent missions</p>
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
    </main>
  );
}
