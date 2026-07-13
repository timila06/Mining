import Link from "next/link";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { formatDate, relationValue, riskClass } from "@/app/app/_components/format";
import { roleLabel } from "@/app/app/_components/permissions";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { supabase, user, profile } = await getAuthedContext("/app/alerts");
  let query = supabase
    .from("alerts")
    .select(`
      id,
      title,
      risk_level,
      status,
      created_at,
      assigned_to,
      recommended_action,
      missions(id, mission_code),
      mine_zones(id, code, name),
      sensor_readings(reading_value, unit, drone_sensors(id, sensor_key, label, safe_min, safe_max)),
      profiles!alerts_assigned_to_fkey(full_name)
    `)
    .order("created_at", { ascending: false });

  const severity = typeof params.severity === "string" ? params.severity : "";
  const status = typeof params.status === "string" ? params.status : "";
  const date = typeof params.date === "string" ? params.date : "";
  const mission = typeof params.mission === "string" ? params.mission : "";
  const zone = typeof params.zone === "string" ? params.zone : "";
  const sensor = typeof params.sensor === "string" ? params.sensor : "";

  if (severity) query = query.eq("risk_level", severity);
  if (status) query = query.eq("status", status);
  if (date) query = query.gte("created_at", `${date}T00:00:00`).lt("created_at", `${date}T23:59:59`);
  if (mission) query = query.eq("mission_id", mission);
  if (zone) query = query.eq("mine_zone_id", zone);

  const [{ data: alerts, error }, { data: missions }, { data: zones }, { data: sensors }] = await Promise.all([
    query,
    supabase.from("missions").select("id, mission_code").order("started_at", { ascending: false }).limit(20),
    supabase.from("mine_zones").select("id, code").order("code"),
    supabase.from("drone_sensors").select("id, sensor_key, label").order("label"),
  ]);

  const filteredAlerts = sensor
    ? (alerts ?? []).filter((alert) => {
        const sensorRelation = Array.isArray(alert.sensor_readings) ? alert.sensor_readings[0] : alert.sensor_readings;
        const droneSensor = Array.isArray(sensorRelation?.drone_sensors) ? sensorRelation?.drone_sensors[0] : sensorRelation?.drone_sensors;
        return droneSensor?.id === sensor;
      })
    : (alerts ?? []);

  return (
    <AppShell
      title="Alert management"
      eyebrow="Operation MOLE"
      userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`}
      role={profile?.role}
    >
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <form className="grid gap-3 rounded-lg border border-stone-200 bg-white p-5 md:grid-cols-6">
          <select name="severity" defaultValue={severity} className="rounded-md border border-stone-300 px-3 py-2 text-sm">
            <option value="">Severity</option>
            {["low", "medium", "high", "critical"].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select name="status" defaultValue={status} className="rounded-md border border-stone-300 px-3 py-2 text-sm">
            <option value="">Status</option>
            {["open", "acknowledged", "investigating", "resolved", "dismissed"].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select name="mission" defaultValue={mission} className="rounded-md border border-stone-300 px-3 py-2 text-sm">
            <option value="">Mission</option>
            {(missions ?? []).map((item) => <option key={item.id} value={item.id}>{item.mission_code}</option>)}
          </select>
          <select name="zone" defaultValue={zone} className="rounded-md border border-stone-300 px-3 py-2 text-sm">
            <option value="">Zone</option>
            {(zones ?? []).map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
          </select>
          <select name="sensor" defaultValue={sensor} className="rounded-md border border-stone-300 px-3 py-2 text-sm">
            <option value="">Sensor</option>
            {(sensors ?? []).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <input name="date" type="date" defaultValue={date} className="rounded-md border border-stone-300 px-3 py-2 text-sm" />
          <button className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-bold text-white md:col-span-6">Apply filters</button>
        </form>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">
            <p className="font-black">Database error</p>
            <p className="mt-2 text-sm">{error.message}</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="font-black">No alerts found</p>
            <p className="mt-2 text-sm text-stone-600">Try a different filter or run a persisted mission.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white p-5">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="border-b border-stone-200 text-stone-500">
                <tr>
                  <th className="py-2 pr-4">Severity</th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Mission</th>
                  <th className="py-2 pr-4">Zone</th>
                  <th className="py-2 pr-4">Sensor</th>
                  <th className="py-2 pr-4">Current</th>
                  <th className="py-2 pr-4">Threshold</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Assigned</th>
                  <th className="py-2 pr-4">Recommended action</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => {
                  const reading = Array.isArray(alert.sensor_readings) ? alert.sensor_readings[0] : alert.sensor_readings;
                  const droneSensor = Array.isArray(reading?.drone_sensors) ? reading?.drone_sensors[0] : reading?.drone_sensors;
                  const threshold = droneSensor ? `${droneSensor.safe_min ?? "-"}-${droneSensor.safe_max ?? "-"} ${reading?.unit ?? ""}` : "Unknown";
                  return (
                    <tr key={alert.id} className="border-b border-stone-100 last:border-0">
                      <td className="py-3 pr-4"><span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${riskClass(alert.risk_level)}`}>{alert.risk_level}</span></td>
                      <td className="py-3 pr-4 font-bold">{alert.title}</td>
                      <td className="py-3 pr-4">{relationValue(alert.missions, "mission_code")}</td>
                      <td className="py-3 pr-4">{relationValue(alert.mine_zones, "code")}</td>
                      <td className="py-3 pr-4">{droneSensor?.label ?? "Unknown"}</td>
                      <td className="py-3 pr-4">{reading ? `${reading.reading_value} ${reading.unit}` : "Unknown"}</td>
                      <td className="py-3 pr-4">{threshold}</td>
                      <td className="py-3 pr-4">{formatDate(alert.created_at)}</td>
                      <td className="py-3 pr-4">{alert.status}</td>
                      <td className="py-3 pr-4">{relationValue(alert.profiles, "full_name")}</td>
                      <td className="py-3 pr-4">{alert.recommended_action}</td>
                      <td className="py-3">
                        <Link className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-bold text-white" href={`/app/alerts/${alert.id}`}>
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}

