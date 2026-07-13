import Link from "next/link";
import { Lock, Radio } from "lucide-react";
import { signIn } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f3ee] px-4 py-10 text-stone-950">
      <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-stone-950 text-white">
            <Radio className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Operation MOLE</span>
            <span className="block text-lg font-black">Operator Login</span>
          </span>
        </Link>

        <form action={signIn} className="mt-6 grid gap-4">
          <input type="hidden" name="next" value={params.next ?? "/app/dashboard"} />
          <label className="grid gap-2 text-sm font-bold text-stone-700">
            Email
            <input
              className="rounded-md border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-600"
              name="email"
              placeholder="operator@example.com"
              required
              type="email"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-stone-700">
            Password
            <input
              className="rounded-md border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-600"
              name="password"
              placeholder="Password"
              required
              type="password"
            />
          </label>
          {params.error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {params.error}
            </p>
          ) : null}
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-3 font-black text-white hover:bg-emerald-800">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Enter dashboard
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm font-semibold">
          <Link className="text-emerald-700" href="/forgot-password">
            Forgot password?
          </Link>
          <Link className="text-stone-500" href="/">
            Back home
          </Link>
        </div>
        <p className="mt-5 text-xs leading-5 text-stone-500">
          Public registration is disabled for this prototype. Operators must be created manually in Supabase Auth.
        </p>
      </section>
    </main>
  );
}
