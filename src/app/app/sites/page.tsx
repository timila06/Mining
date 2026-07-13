import { AccessDenied } from "@/app/app/_components/AccessDenied";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { canManageSites, roleLabel } from "@/app/app/_components/permissions";

export default async function SitesPage() {
  const { supabase, user, profile } = await getAuthedContext("/app/sites");
  const { data: sites, error } = canManageSites(profile?.role)
    ? await supabase.from("mine_sites").select("id, name, region, country, status, operator_name").order("name")
    : { data: null, error: null };

  return (
    <AppShell title="Mine sites" eyebrow="Operation MOLE" userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`} role={profile?.role}>
      {!canManageSites(profile?.role) ? (
        <AccessDenied role={roleLabel(profile?.role)} message="Only Administrators and Mine Operators can manage mine sites." />
      ) : (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">{error.message}</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(sites ?? []).map((site) => (
                <article key={site.id} className="rounded-lg border border-stone-200 bg-white p-5">
                  <p className="text-sm font-bold text-stone-500">Mine site</p>
                  <h2 className="mt-2 text-2xl font-black">{site.name}</h2>
                  <p className="mt-1 text-sm text-stone-600">{site.region}, {site.country}</p>
                  <p className="mt-3 text-sm font-bold text-stone-700">Status: {site.status}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
