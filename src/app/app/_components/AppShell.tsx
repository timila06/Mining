import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export async function getAuthedContext(next: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
}

export function AppShell({
  title,
  eyebrow,
  userLabel,
  children,
}: {
  title: string;
  eyebrow: string;
  userLabel: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f5f3ee] text-stone-950">
      <nav className="border-b border-stone-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p>
            <h1 className="text-2xl font-black">{title}</h1>
            <p className="text-sm text-stone-600">{userLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link className="rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50" href="/app/dashboard">
              Dashboard
            </Link>
            <Link className="rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50" href="/app/missions">
              Missions
            </Link>
            <Link className="rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50" href="/app/reports">
              Reports
            </Link>
            <form action={signOut}>
              <button className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50">
                Logout
              </button>
            </form>
          </div>
        </div>
      </nav>
      {children}
    </main>
  );
}
