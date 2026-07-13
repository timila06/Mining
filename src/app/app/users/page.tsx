import { AccessDenied } from "@/app/app/_components/AccessDenied";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { relationValue } from "@/app/app/_components/format";
import { canManageUsers, roleLabel } from "@/app/app/_components/permissions";
import { updateUserProfile } from "./actions";

const roles = ["administrator", "mine_operator", "safety_officer", "drone_operator", "viewer", "regulator"];
const statuses = ["active", "suspended", "inactive"];

export default async function UsersPage() {
  const { supabase, user, profile } = await getAuthedContext("/app/users");
  const isAdmin = canManageUsers(profile?.role);
  const [{ data: users, error }, { data: sites }, { data: audits }] = isAdmin
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, role, organization, mine_site_id, account_status, last_login, created_at, mine_sites(name)")
          .order("created_at", { ascending: false }),
        supabase.from("mine_sites").select("id, name").order("name"),
        supabase
          .from("audit_logs")
          .select("id, action_type, target_user, previous_value, new_value, created_at, profiles!audit_logs_administrator_fkey(full_name)")
          .order("created_at", { ascending: false })
          .limit(8),
      ])
    : [{ data: null, error: null }, { data: null }, { data: null }];

  return (
    <AppShell title="User administration" eyebrow="Operation MOLE" userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`} role={profile?.role}>
      {!isAdmin ? (
        <AccessDenied role={roleLabel(profile?.role)} message="Only Administrators can manage users." />
      ) : (
        <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">{error.message}</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white p-5">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="border-b border-stone-200 text-stone-500">
                  <tr>
                    <th className="py-2 pr-4">Full name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Organization</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Assigned mine site</th>
                    <th className="py-2 pr-4">Account status</th>
                    <th className="py-2 pr-4">Last login</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2">Admin actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(users ?? []).map((item) => {
                    const siteName = relationValue(item.mine_sites, "name");

                    return (
                      <tr key={item.id} className="border-b border-stone-100 align-top last:border-0">
                        <td className="py-3 pr-4 font-bold">{item.full_name}</td>
                        <td className="py-3 pr-4">{item.email ?? "Not stored"}</td>
                        <td className="py-3 pr-4">{item.organization ?? "Not set"}</td>
                        <td className="py-3 pr-4">{roleLabel(item.role)}</td>
                        <td className="py-3 pr-4">{siteName === "Unknown" ? "Unassigned" : siteName}</td>
                        <td className="py-3 pr-4">{item.account_status}</td>
                        <td className="py-3 pr-4">{item.last_login ? new Date(item.last_login).toLocaleString() : "Never"}</td>
                        <td className="py-3 pr-4">{new Date(item.created_at).toLocaleDateString()}</td>
                        <td className="py-3">
                          <form action={updateUserProfile} className="grid min-w-[420px] gap-2">
                            <input type="hidden" name="targetUser" value={item.id} />
                            <input name="fullName" defaultValue={item.full_name} required className="rounded-md border border-stone-300 px-2 py-1" />
                            <input name="organization" defaultValue={item.organization ?? ""} className="rounded-md border border-stone-300 px-2 py-1" />
                            <div className="grid grid-cols-3 gap-2">
                              <select name="role" defaultValue={item.role} className="rounded-md border border-stone-300 px-2 py-1">
                                {roles.map((role) => (
                                  <option key={role} value={role}>
                                    {roleLabel(role)}
                                  </option>
                                ))}
                              </select>
                              <select name="mineSiteId" defaultValue={item.mine_site_id ?? ""} className="rounded-md border border-stone-300 px-2 py-1">
                                <option value="">No site</option>
                                {(sites ?? []).map((site) => (
                                  <option key={site.id} value={site.id}>
                                    {site.name}
                                  </option>
                                ))}
                              </select>
                              <select name="accountStatus" defaultValue={item.account_status} className="rounded-md border border-stone-300 px-2 py-1">
                                {statuses.map((status) => (
                                  <option key={status}>{status}</option>
                                ))}
                              </select>
                            </div>
                            <button className="w-fit rounded-md bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Save user</button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <article className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-sm font-bold text-stone-500">Recent administration audit</p>
            <div className="mt-4 space-y-3">
              {(audits ?? []).map((audit) => (
                <div key={audit.id} className="rounded-md border border-stone-200 p-3 text-sm">
                  <p className="font-bold">{audit.action_type}</p>
                  <p className="text-stone-600">Administrator: {relationValue(audit.profiles, "full_name")} - {new Date(audit.created_at).toLocaleString()}</p>
                  <p className="mt-1 text-stone-600">Target user: {audit.target_user}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}
    </AppShell>
  );
}
