import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, organization")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-[#f5f3ee] text-stone-950">
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Operation MOLE</p>
            <h1 className="text-2xl font-black">Protected operator dashboard</h1>
            <p className="text-sm text-stone-600">
              Signed in as {profile?.full_name ?? user.email} {profile?.role ? `(${profile.role})` : ""}
            </p>
          </div>
          <form action={signOut}>
            <button className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50">
              Logout
            </button>
          </form>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3">
        <article className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm font-bold text-stone-500">Authentication</p>
          <p className="mt-2 text-2xl font-black text-emerald-700">Active session</p>
          <p className="mt-2 text-sm text-stone-600">This route is protected by Supabase middleware.</p>
        </article>
        <article className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm font-bold text-stone-500">Profile</p>
          <p className="mt-2 text-2xl font-black">{profile?.organization ?? "No organization set"}</p>
          <p className="mt-2 text-sm text-stone-600">Profile rows use the same UUID as Supabase Auth users.</p>
        </article>
        <article className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm font-bold text-stone-500">Next connection</p>
          <p className="mt-2 text-2xl font-black">Live records</p>
          <p className="mt-2 text-sm text-stone-600">Mission, drone, alert, and report data can now be wired in.</p>
        </article>
      </section>
    </main>
  );
}
