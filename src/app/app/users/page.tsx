import { AccessDenied } from "@/app/app/_components/AccessDenied";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { canManageUsers, roleLabel } from "@/app/app/_components/permissions";

export default async function UsersPage() {
  const { supabase, user, profile } = await getAuthedContext("/app/users");
  const { data: users, error } = canManageUsers(profile?.role)
    ? await supabase.from("profiles").select("id, full_name, role, organization, created_at").order("created_at", { ascending: false })
    : { data: null, error: null };

  return (
    <AppShell title="User administration" eyebrow="Operation MOLE" userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`} role={profile?.role}>
      {!canManageUsers(profile?.role) ? (
        <AccessDenied role={roleLabel(profile?.role)} message="Only Administrators can manage users." />
      ) : (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">{error.message}</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white p-5">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-stone-200 text-stone-500">
                  <tr><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Role</th><th className="py-2 pr-4">Organization</th><th className="py-2">Created</th></tr>
                </thead>
                <tbody>
                  {(users ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-stone-100 last:border-0">
                      <td className="py-3 pr-4 font-bold">{item.full_name}</td>
                      <td className="py-3 pr-4">{roleLabel(item.role)}</td>
                      <td className="py-3 pr-4">{item.organization ?? "Not set"}</td>
                      <td className="py-3">{new Date(item.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
