import Link from "next/link";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { formatDate, relationValue, riskClass } from "@/app/app/_components/format";
import { roleLabel } from "@/app/app/_components/permissions";

function relationObject<T extends Record<string, unknown>>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] : relation;
}

export default async function MissionDetailPage({ params }: { params: Promise<{ missionId: string }> }) {
  const { missionId } = await params;
  const { supabase, user, profile } = await getAuthedContext(`/app/missions/${missionId}`);

  const [missionResult, zonesResult, readingsResult, eventsResult, alertsResult, reportResult, droneResult] = await Promise.all([
    supabase
      .from("missions")
      .select("id, mission_code, title, mission_type, selected_scenario, status, risk_level, progress_percent, started_at, completed_at, mine_sites(name, region), drones(id, drone_code, name), profiles(full_name)")
      .eq("id", missionId)
      .maybeSingle(),
    supabase
      .from("mission_zones")
      .select("id, visit_order, status, entered_at, exited_at, mine_zones(code, name, level)")
      .eq("mission_id", missionId)
      .order("visit_order", { ascending: true }),
    supabase
      .from("sensor_readings")
      .select("id, reading_value, unit, risk_level, recorded_at, simulated, drone_sensors(label), mine_zones(code)")
      .eq("mission_id", missionId)
      .order("recorded_at", { ascending: false }),
    supabase
      .from("mission_events")
      .select("id, event_type, summary, created_at")
      .eq("mission_id", missionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("alerts")
      .select("id, title, description, risk_level, status, created_at, mine_zones(code)")
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select("id, title, final_entry_decision, highest_severity, hazards_detected, report_status, safety_approvals(decision, comments, conditions, approved_at, profiles!safety_approvals_reviewed_by_fkey(full_name))")
      .eq("mission_id", missionId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("drones")
      .select("battery_percent, signal_percent")
      .eq("drone_code", "MOLE-01")
      .maybeSingle(),
  ]);

  const databaseError =
    missionResult.error || zonesResult.error || readingsResult.error || eventsResult.error || alertsResult.error || reportResult.error || droneResult.error;
  const mission = missionResult.data;
  const approval = relationObject(reportResult.data?.safety_approvals);

  return (
    <AppShell
      title={mission?.mission_code ?? "Mission detail"}
      eyebrow="Mission history"
      userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`}
      role={profile?.role}
    >
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {databaseError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">
            <p className="font-black">Database error</p>
            <p className="mt-2 text-sm">{databaseError.message}</p>
          </div>
        ) : !mission ? (
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="font-black">Invalid mission ID</p>
            <p className="mt-2 text-sm text-stone-600">This mission does not exist or is not available to this account.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-4">
              <article className="rounded-lg border border-stone-200 bg-white p-5 lg:col-span-2">
                <p className="text-sm font-bold text-stone-500">Mission information</p>
                <h2 className="mt-2 text-2xl font-black">{mission.title}</h2>
                <p className="mt-2 text-sm text-stone-600">
                  {relationValue(mission.mine_sites, "name")} · {mission.selected_scenario} · {relationValue(mission.profiles, "full_name")}
                </p>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Status</p>
                <p className="mt-2 text-2xl font-black">{mission.status}</p>
                <p className="mt-1 text-sm text-stone-600">{mission.progress_percent}% complete</p>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Battery and signal</p>
                <p className="mt-2 text-2xl font-black">{droneResult.data?.battery_percent ?? "?"}% / {droneResult.data?.signal_percent ?? "?"}%</p>
                <p className="mt-1 text-sm text-stone-600">{relationValue(mission.drones, "drone_code")}</p>
              </article>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Visited zones</p>
                <div className="mt-4 space-y-3">
                  {(zonesResult.data ?? []).map((zone) => (
                    <div key={zone.id} className="rounded-md border border-stone-200 p-3">
                      <p className="font-bold">
                        {zone.visit_order}. {relationValue(zone.mine_zones, "code")} · {relationValue(zone.mine_zones, "name")}
                      </p>
                      <p className="mt-1 text-sm text-stone-600">{zone.status} · {formatDate(zone.entered_at)}</p>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Mission event timeline</p>
                <div className="mt-4 space-y-3">
                  {(eventsResult.data ?? []).map((event) => (
                    <div key={event.id} className="border-b border-stone-100 pb-3 last:border-0">
                      <p className="font-bold">{event.summary}</p>
                      <p className="mt-1 text-sm text-stone-600">{event.event_type} · {formatDate(event.created_at)}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <article className="rounded-lg border border-stone-200 bg-white p-5">
              <p className="text-sm font-bold text-stone-500">Sensor readings</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(readingsResult.data ?? []).map((reading) => (
                  <div key={reading.id} className="rounded-md border border-stone-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold">{relationValue(reading.drone_sensors, "label")}</p>
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${riskClass(reading.risk_level)}`}>{reading.risk_level}</span>
                    </div>
                    <p className="mt-2 text-xl font-black">{Number(reading.reading_value).toLocaleString()} {reading.unit}</p>
                    <p className="mt-1 text-sm text-stone-600">{relationValue(reading.mine_zones, "code")} · {reading.simulated ? "simulated" : "live"} · {formatDate(reading.recorded_at)}</p>
                  </div>
                ))}
              </div>
            </article>

            <div className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Generated alerts</p>
                <div className="mt-4 space-y-3">
                  {(alertsResult.data ?? []).map((alert) => (
                    <div key={alert.id} className="rounded-md border border-stone-200 p-3">
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${riskClass(alert.risk_level)}`}>{alert.risk_level}</span>
                      <p className="mt-2 font-bold">{alert.title}</p>
                      <p className="text-sm text-stone-600">{alert.description}</p>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Linked report</p>
                {reportResult.data ? (
                  <div className="mt-4">
                    <p className="font-bold">{reportResult.data.title}</p>
                    <p className="mt-1 text-sm text-stone-600">{reportResult.data.final_entry_decision}</p>
                    {approval ? (
                      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                        <p className="font-bold">Approved decision: {approval.decision}</p>
                        <p className="mt-1">Reviewed by {relationValue(approval.profiles, "full_name")} on {formatDate(approval.approved_at)}</p>
                        <p className="mt-1">{approval.comments}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-amber-700">Awaiting safety approval</p>
                    )}
                    <Link className="mt-4 inline-flex rounded-md bg-emerald-700 px-3 py-2 text-sm font-bold text-white" href={`/app/reports/${reportResult.data.id}`}>
                      View Report
                    </Link>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-stone-600">No linked report yet.</p>
                )}
              </article>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}

