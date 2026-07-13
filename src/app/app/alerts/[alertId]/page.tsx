import Link from "next/link";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { formatDate, relationValue, riskClass } from "@/app/app/_components/format";
import { roleLabel } from "@/app/app/_components/permissions";
import { assignAlertToSelf, updateAlertStatus } from "../actions";

function relationObject<T extends Record<string, unknown>>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] : relation;
}

export default async function AlertDetailPage({ params }: { params: Promise<{ alertId: string }> }) {
  const { alertId } = await params;
  const { supabase, user, profile } = await getAuthedContext(`/app/alerts/${alertId}`);

  const { data: alert, error } = await supabase
    .from("alerts")
    .select(`
      id,
      title,
      description,
      risk_level,
      status,
      created_at,
      acknowledged_at,
      resolved_at,
      recommended_action,
      resolution_note,
      corrective_action,
      missions(id, mission_code),
      mine_zones(code, name),
      sensor_readings(reading_value, unit, drone_sensors(label, safe_min, safe_max)),
      profiles!alerts_assigned_to_fkey(full_name)
    `)
    .eq("id", alertId)
    .maybeSingle();

  const mission = relationObject(alert?.missions);
  const missionId = typeof mission?.id === "string" ? mission.id : null;
  const { data: report } = missionId
    ? await supabase.from("reports").select("id, title").eq("mission_id", missionId).order("generated_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };

  const reading = Array.isArray(alert?.sensor_readings) ? alert?.sensor_readings[0] : alert?.sensor_readings;
  const droneSensor = Array.isArray(reading?.drone_sensors) ? reading?.drone_sensors[0] : reading?.drone_sensors;
  const threshold = droneSensor ? `${droneSensor.safe_min ?? "-"}-${droneSensor.safe_max ?? "-"} ${reading?.unit ?? ""}` : "Unknown";

  return (
    <AppShell
      title={alert?.title ?? "Alert detail"}
      eyebrow="Alert management"
      userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`}
      role={profile?.role}
    >
      <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">
            <p className="font-black">Database error</p>
            <p className="mt-2 text-sm">{error.message}</p>
          </div>
        ) : !alert ? (
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="font-black">Invalid alert ID</p>
            <p className="mt-2 text-sm text-stone-600">This alert does not exist or is not available to this account.</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className={`inline-flex rounded-md border px-3 py-1 text-sm font-bold ${riskClass(alert.risk_level)}`}>
                    {alert.risk_level}
                  </span>
                  <h2 className="mt-3 text-3xl font-black">{alert.title}</h2>
                  <p className="mt-2 text-stone-700">{alert.description}</p>
                </div>
                <div className="text-sm text-stone-600">
                  <p>Status: <strong>{alert.status}</strong></p>
                  <p>Created: {formatDate(alert.created_at)}</p>
                  <p>Assigned: {relationValue(alert.profiles, "full_name")}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Mission</p>
                <p className="mt-2 text-xl font-black">{relationValue(alert.missions, "mission_code")}</p>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Zone and sensor</p>
                <p className="mt-2 text-xl font-black">{relationValue(alert.mine_zones, "code")} · {droneSensor?.label ?? "Unknown"}</p>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Current vs threshold</p>
                <p className="mt-2 text-xl font-black">{reading ? `${reading.reading_value} ${reading.unit}` : "Unknown"}</p>
                <p className="mt-1 text-sm text-stone-600">{threshold}</p>
              </article>
            </div>

            <article className="rounded-lg border border-stone-200 bg-white p-5">
              <p className="text-sm font-bold text-stone-500">Recommended action</p>
              <p className="mt-2 text-stone-700">{alert.recommended_action}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {missionId ? (
                  <Link className="rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700" href={`/app/missions/${missionId}`}>
                    Open linked mission
                  </Link>
                ) : null}
                {report ? (
                  <Link className="rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700" href={`/app/reports/${report.id}`}>
                    Open linked report
                  </Link>
                ) : null}
              </div>
            </article>

            <article className="rounded-lg border border-stone-200 bg-white p-5">
              <p className="text-sm font-bold text-stone-500">Alert actions</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={updateAlertStatus}>
                  <input type="hidden" name="alertId" value={alert.id} />
                  <input type="hidden" name="status" value="acknowledged" />
                  <button className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-bold text-white">Acknowledge</button>
                </form>
                <form action={assignAlertToSelf}>
                  <input type="hidden" name="alertId" value={alert.id} />
                  <button className="rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700">Assign to me</button>
                </form>
                <form action={updateAlertStatus}>
                  <input type="hidden" name="alertId" value={alert.id} />
                  <input type="hidden" name="status" value="investigating" />
                  <button className="rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700">Mark investigating</button>
                </form>
              </div>
            </article>

            <article className="rounded-lg border border-stone-200 bg-white p-5">
              <p className="text-sm font-bold text-stone-500">Resolution form</p>
              <form action={updateAlertStatus} className="mt-4 grid gap-3">
                <input type="hidden" name="alertId" value={alert.id} />
                <label className="text-sm font-bold text-stone-700">
                  Resolved status
                  <select name="status" defaultValue="resolved" className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2">
                    <option value="resolved">Resolve</option>
                    <option value="dismissed">Dismiss</option>
                  </select>
                </label>
                <label className="text-sm font-bold text-stone-700">
                  Resolution note
                  <textarea name="resolutionNote" required className="mt-1 min-h-24 w-full rounded-md border border-stone-300 px-3 py-2" defaultValue={alert.resolution_note ?? ""} />
                </label>
                <label className="text-sm font-bold text-stone-700">
                  Corrective action
                  <textarea name="correctiveAction" required className="mt-1 min-h-24 w-full rounded-md border border-stone-300 px-3 py-2" defaultValue={alert.corrective_action ?? ""} />
                </label>
                <button className="w-fit rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Save resolution</button>
              </form>
            </article>
          </>
        )}
      </section>
    </AppShell>
  );
}

