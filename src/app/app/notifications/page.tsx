import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { roleLabel } from "@/app/app/_components/permissions";
import { markAllNotificationsRead, updateNotificationPreferences } from "./actions";
import { NotificationsRealtime } from "./NotificationsRealtime";

type SearchParams = {
  unread?: string;
  severity?: string;
  mission?: string;
  site?: string;
  date?: string;
};

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { supabase, user, profile } = await getAuthedContext("/app/notifications");
  const [missionsResult, sitesResult] = await Promise.all([
    supabase.from("missions").select("id, mission_code, mine_site_id").order("started_at", { ascending: false }).limit(30),
    supabase.from("mine_sites").select("id, name").order("name"),
  ]);

  let query = supabase
    .from("notifications")
    .select("id, title, message, severity, read_at, created_at, alert_id, mission_id, alerts(mine_zones(code)), missions(mine_site_id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (params.unread === "true") query = query.is("read_at", null);
  if (params.severity) query = query.eq("severity", params.severity);
  if (params.mission) query = query.eq("mission_id", params.mission);
  if (params.site) {
    const missionIdsForSite = (missionsResult.data ?? []).filter((mission) => mission.mine_site_id === params.site).map((mission) => mission.id);
    query = missionIdsForSite.length ? query.in("mission_id", missionIdsForSite) : query.eq("mission_id", "00000000-0000-0000-0000-000000000000");
  }
  if (params.date) query = query.gte("created_at", `${params.date}T00:00:00`).lte("created_at", `${params.date}T23:59:59`);

  const [notificationsResult, prefsResult] = await Promise.all([
    query,
    supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const prefs = prefsResult.data;

  return (
    <AppShell title="Notifications" eyebrow="Operation MOLE" userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`} role={profile?.role}>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <form className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-sm font-bold text-stone-500">Filters</p>
            <label className="mt-4 flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" name="unread" value="true" defaultChecked={params.unread === "true"} /> Unread
            </label>
            <select name="severity" defaultValue={params.severity ?? ""} className="mt-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
              <option value="">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">Dangerous</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select name="mission" defaultValue={params.mission ?? ""} className="mt-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
              <option value="">All missions</option>
              {(missionsResult.data ?? []).map((mission) => <option key={mission.id} value={mission.id}>{mission.mission_code}</option>)}
            </select>
            <select name="site" defaultValue={params.site ?? ""} className="mt-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
              <option value="">All mine sites</option>
              {(sitesResult.data ?? []).map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
            <input type="date" name="date" defaultValue={params.date ?? ""} className="mt-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
            <button className="mt-3 rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Apply filters</button>
          </form>

          <form action={markAllNotificationsRead} className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-sm font-bold text-stone-500">Actions</p>
            <button className="mt-3 rounded-md border border-stone-300 px-4 py-2 text-sm font-bold">Mark All as Read</button>
          </form>

          <form action={updateNotificationPreferences} className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-sm font-bold text-stone-500">Notification preferences</p>
            {[
              ["critical_alerts", "Critical alerts"],
              ["dangerous_alerts", "Dangerous alerts"],
              ["mission_status_changes", "Mission status changes"],
              ["safety_approvals", "Safety approvals"],
              ["maintenance_warnings", "Maintenance warnings"],
            ].map(([key, label]) => (
              <label key={key} className="mt-3 flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" name={key} defaultChecked={prefs?.[key as keyof typeof prefs] !== false} /> {label}
              </label>
            ))}
            <button className="mt-4 rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Save preferences</button>
          </form>
        </div>

        {notificationsResult.error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">{notificationsResult.error.message}</div>
        ) : (
          <NotificationsRealtime initialRows={notificationsResult.data ?? []} userId={user.id} />
        )}
      </section>
    </AppShell>
  );
}
