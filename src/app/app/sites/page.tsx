import Link from "next/link";
import { AccessDenied } from "@/app/app/_components/AccessDenied";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { canManageSettings, roleLabel } from "@/app/app/_components/permissions";
import { saveMineSite } from "./actions";

export default async function SitesPage() {
  const { supabase, user, profile } = await getAuthedContext("/app/sites");
  const isAdmin = canManageSettings(profile?.role);
  const { data: sites, error } = await supabase
    .from("mine_sites")
    .select("id, name, region, country, location, mine_type, status, operator_name, mine_zones(count), missions(count)")
    .order("name");

  return (
    <AppShell title="Mine sites" eyebrow="Operation MOLE" userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`} role={profile?.role}>
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {!isAdmin ? (
          <AccessDenied role={roleLabel(profile?.role)} message="Mine-site records are read-only unless you are an Administrator." />
        ) : (
          <article className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-sm font-bold text-stone-500">Create mine site</p>
            <form action={saveMineSite} className="mt-4 grid gap-3 md:grid-cols-3">
              <input name="name" required placeholder="Mine name" className="rounded-md border border-stone-300 px-3 py-2" />
              <input name="region" required placeholder="Region" className="rounded-md border border-stone-300 px-3 py-2" />
              <input name="country" required defaultValue="Thailand" className="rounded-md border border-stone-300 px-3 py-2" />
              <input name="location" placeholder="Location" className="rounded-md border border-stone-300 px-3 py-2" />
              <input name="mineType" defaultValue="underground" className="rounded-md border border-stone-300 px-3 py-2" />
              <select name="status" defaultValue="unknown" className="rounded-md border border-stone-300 px-3 py-2">
                {["unknown", "clear", "caution", "unsafe", "blocked"].map((value) => <option key={value}>{value}</option>)}
              </select>
              <input name="operatorName" placeholder="Operator" className="rounded-md border border-stone-300 px-3 py-2" />
              <input name="emergencyContact" placeholder="Emergency contact" className="rounded-md border border-stone-300 px-3 py-2" />
              <input name="baseStationInfo" placeholder="Base station" className="rounded-md border border-stone-300 px-3 py-2" />
              <button className="w-fit rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white md:col-span-3">Create site</button>
            </form>
          </article>
        )}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">{error.message}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(sites ?? []).map((site) => (
              <article key={site.id} className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Mine site</p>
                <h2 className="mt-2 text-2xl font-black">{site.name}</h2>
                <p className="mt-1 text-sm text-stone-600">{site.location ?? `${site.region}, ${site.country}`} · {site.mine_type}</p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div><p className="font-bold">Status</p><p>{site.status}</p></div>
                  <div><p className="font-bold">Zones</p><p>{site.mine_zones?.[0]?.count ?? 0}</p></div>
                  <div><p className="font-bold">Active missions</p><p>{site.missions?.[0]?.count ?? 0}</p></div>
                </div>
                <p className="mt-3 text-sm text-stone-600">Assigned users: operational team roster</p>
                <Link href={`/app/sites/${site.id}`} className="mt-4 inline-flex rounded-md bg-emerald-700 px-3 py-2 text-sm font-bold text-white">
                  View site
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
