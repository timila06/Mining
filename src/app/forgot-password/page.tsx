import Link from "next/link";
import { sendPasswordReset } from "@/app/auth/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f3ee] px-4 py-10 text-stone-950">
      <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black">Reset password</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Enter the email for your manually created Operation MOLE operator account.
        </p>
        <form action={sendPasswordReset} className="mt-6 grid gap-4">
          <input type="hidden" name="origin" value={process.env.NEXT_PUBLIC_SITE_URL ?? ""} />
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
          {params.error ? <p className="text-sm font-bold text-red-700">{params.error}</p> : null}
          {params.sent ? <p className="text-sm font-bold text-emerald-700">Reset email sent.</p> : null}
          <button className="rounded-md bg-emerald-700 px-4 py-3 font-black text-white hover:bg-emerald-800">
            Send reset link
          </button>
        </form>
        <Link className="mt-5 inline-block text-sm font-semibold text-stone-500" href="/login">
          Back to login
        </Link>
      </section>
    </main>
  );
}
