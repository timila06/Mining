import { AccessDenied } from "@/app/app/_components/AccessDenied";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { canManageSettings, roleLabel } from "@/app/app/_components/permissions";
import { saveThreshold } from "./actions";

type SettingValue = {
  display_name?: string;
  value?: number;
  unit?: string;
  severity_level?: string;
  sensor_key?: string;
  comparison?: string;
};

export default async function SettingsPage() {
  const { supabase, user, profile } = await getAuthedContext("/app/settings");
  const isAdmin = canManageSettings(profile?.role);
  const { data: settings, error } = await supabase
    .from("system_settings")
    .select("id, setting_key, setting_value, description, updated_at")
    .like("setting_key", "threshold_%")
    .order("setting_key");

  return (
    <AppShell title="System settings" eyebrow="Operation MOLE" userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`} role={profile?.role}>
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {!isAdmin ? <AccessDenied role={roleLabel(profile?.role)} message="Settings and thresholds are read-only unless you are an Administrator." /> : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">{error.message}</div>
        ) : !settings?.length ? (
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="font-black">No thresholds configured</p>
            <p className="mt-2 text-sm text-stone-600">Run the site and threshold management migration.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {settings.map((setting) => {
              const value = setting.setting_value as SettingValue;
              return (
                <form key={setting.id} action={saveThreshold} className="rounded-lg border border-stone-200 bg-white p-5">
                  <input type="hidden" name="id" value={setting.id} />
                  <input type="hidden" name="settingKey" value={setting.setting_key} />
                  <input type="hidden" name="sensorKey" value={value.sensor_key ?? ""} />
                  <input type="hidden" name="comparison" value={value.comparison ?? "gt"} />
                  <div className="grid gap-3 md:grid-cols-6">
                    <label className="text-sm font-bold text-stone-700 md:col-span-2">
                      Display name
                      <input name="displayName" defaultValue={value.display_name ?? setting.setting_key} disabled={!isAdmin} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" />
                    </label>
                    <label className="text-sm font-bold text-stone-700">
                      Value
                      <input name="value" type="number" step="0.1" min="0" max={value.sensor_key === "battery" || value.sensor_key === "radio_signal" ? 100 : value.sensor_key === "oxygen" ? 25 : undefined} defaultValue={value.value ?? 0} disabled={!isAdmin} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" />
                    </label>
                    <label className="text-sm font-bold text-stone-700">
                      Unit
                      <input name="unit" defaultValue={value.unit ?? ""} disabled={!isAdmin} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" />
                    </label>
                    <label className="text-sm font-bold text-stone-700">
                      Severity
                      <select name="severityLevel" defaultValue={value.severity_level ?? "medium"} disabled={!isAdmin} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2">
                        {["low", "medium", "high", "critical"].map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-bold text-stone-700">
                      Updated
                      <input readOnly value={new Date(setting.updated_at).toLocaleString()} className="mt-1 w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-2" />
                    </label>
                  </div>
                  <label className="mt-3 block text-sm font-bold text-stone-700">
                    Description
                    <input name="description" defaultValue={setting.description ?? ""} disabled={!isAdmin} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" />
                  </label>
                  {isAdmin ? <button className="mt-4 rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Save threshold</button> : null}
                </form>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
