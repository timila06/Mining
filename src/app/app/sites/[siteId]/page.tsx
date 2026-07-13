import { notFound } from "next/navigation";
import { AccessDenied } from "@/app/app/_components/AccessDenied";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { canManageSettings, roleLabel } from "@/app/app/_components/permissions";
import { saveMineSite, saveMineZone } from "../actions";

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { supabase, user, profile } = await getAuthedContext(`/app/sites/${siteId}`);
  const isAdmin = canManageSettings(profile?.role);
  const [{ data: site, error }, { data: zones }] = await Promise.all([
    supabase.from("mine_sites").select("*").eq("id", siteId).maybeSingle(),
    supabase.from("mine_zones").select("*").eq("mine_site_id", siteId).order("code"),
  ]);

  if (error || !site) notFound();

  return (
    <AppShell title={site.name} eyebrow="Mine sites" userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`} role={profile?.role}>
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {!isAdmin ? <AccessDenied role={roleLabel(profile?.role)} message="Site management is read-only unless you are an Administrator." /> : null}

        <article className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm font-bold text-stone-500">Site details</p>
          <form action={saveMineSite} className="mt-4 grid gap-3 md:grid-cols-3">
            <input type="hidden" name="id" value={site.id} />
            <input name="name" required defaultValue={site.name} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2" />
            <input name="region" required defaultValue={site.region} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2" />
            <input name="country" required defaultValue={site.country} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2" />
            <input name="location" defaultValue={site.location ?? ""} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2" />
            <input name="mineType" defaultValue={site.mine_type ?? "underground"} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2" />
            <select name="status" defaultValue={site.status} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2">
              {["unknown", "clear", "caution", "unsafe", "blocked"].map((value) => <option key={value}>{value}</option>)}
            </select>
            <input name="operatorName" defaultValue={site.operator_name ?? ""} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2" />
            <input name="emergencyContact" defaultValue={site.emergency_contact ?? ""} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2" />
            <input name="baseStationInfo" defaultValue={site.base_station_info ?? ""} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2" />
            {isAdmin ? <button className="w-fit rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white md:col-span-3">Save site</button> : null}
          </form>
        </article>

        {isAdmin ? (
          <article className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-sm font-bold text-stone-500">Create zone</p>
            <form action={saveMineZone} className="mt-4 grid gap-3 md:grid-cols-4">
              <input type="hidden" name="mineSiteId" value={site.id} />
              <input name="code" required placeholder="Zone code" className="rounded-md border border-stone-300 px-3 py-2" />
              <input name="name" required placeholder="Zone name" className="rounded-md border border-stone-300 px-3 py-2" />
              <input name="level" placeholder="Level" className="rounded-md border border-stone-300 px-3 py-2" />
              <select name="status" defaultValue="unknown" className="rounded-md border border-stone-300 px-3 py-2">
                {["unknown", "clear", "caution", "unsafe", "blocked"].map((value) => <option key={value}>{value}</option>)}
              </select>
              <input name="x" type="number" step="0.1" placeholder="Map X" className="rounded-md border border-stone-300 px-3 py-2" />
              <input name="y" type="number" step="0.1" placeholder="Map Y" className="rounded-md border border-stone-300 px-3 py-2" />
              <input name="z" type="number" step="0.1" placeholder="Map Z" className="rounded-md border border-stone-300 px-3 py-2" />
              <label className="flex items-center gap-2 text-sm font-bold"><input name="restricted" type="checkbox" /> Restricted</label>
              <button className="w-fit rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white md:col-span-4">Add zone</button>
            </form>
          </article>
        ) : null}

        <article className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm font-bold text-stone-500">Zones</p>
          <div className="mt-4 grid gap-3">
            {(zones ?? []).map((zone) => (
              <form key={zone.id} action={saveMineZone} className="grid gap-3 rounded-md border border-stone-200 p-3 md:grid-cols-6">
                <input type="hidden" name="id" value={zone.id} />
                <input type="hidden" name="mineSiteId" value={site.id} />
                <input name="code" defaultValue={zone.code} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2" />
                <input name="name" defaultValue={zone.name} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2" />
                <input name="level" defaultValue={zone.level ?? ""} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2" />
                <select name="status" defaultValue={zone.status} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2">
                  {["unknown", "clear", "caution", "unsafe", "blocked"].map((value) => <option key={value}>{value}</option>)}
                </select>
                <input name="x" type="number" step="0.1" defaultValue={zone.map_coordinates?.x ?? 0} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2" />
                <input name="y" type="number" step="0.1" defaultValue={zone.map_coordinates?.y ?? 0} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2" />
                <input name="z" type="number" step="0.1" defaultValue={zone.map_coordinates?.z ?? 0} disabled={!isAdmin} className="rounded-md border border-stone-300 px-3 py-2" />
                <label className="flex items-center gap-2 text-sm font-bold"><input name="restricted" type="checkbox" defaultChecked={zone.restricted} disabled={!isAdmin} /> Restricted</label>
                {isAdmin ? <button className="w-fit rounded-md border border-stone-300 px-3 py-2 text-sm font-bold">Save zone</button> : null}
              </form>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
