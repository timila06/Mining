import { AccessDenied } from "@/app/app/_components/AccessDenied";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { canManageSettings, roleLabel } from "@/app/app/_components/permissions";

export default async function SettingsPage() {
  const { supabase, user, profile } = await getAuthedContext("/app/settings");
  const { data: settings, error } = canManageSettings(profile?.role)
    ? await supabase.from("system_settings").select("id, setting_key, setting_value, description, updated_at").order("setting_key")
    : { data: null, error: null };

  return (
    <AppShell title="System settings" eyebrow="Operation MOLE" userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`} role={profile?.role}>
      {!canManageSettings(profile?.role) ? (
        <AccessDenied role={roleLabel(profile?.role)} message="Only Administrators can change system settings and thresholds." />
      ) : (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">{error.message}</div>
          ) : !settings?.length ? (
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <p className="font-black">No settings configured</p>
              <p className="mt-2 text-sm text-stone-600">Threshold editing will be added after administrator setup.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {settings.map((setting) => (
                <article key={setting.id} className="rounded-lg border border-stone-200 bg-white p-5">
                  <p className="font-black">{setting.setting_key}</p>
                  <p className="mt-2 text-sm text-stone-600">{setting.description}</p>
                  <pre className="mt-3 overflow-x-auto rounded-md bg-stone-100 p-3 text-xs">{JSON.stringify(setting.setting_value, null, 2)}</pre>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
