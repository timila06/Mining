import { updatePassword } from "@/app/auth/actions";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f3ee] px-4 py-10 text-stone-950">
      <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black">Set a new password</h1>
        <form action={updatePassword} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-stone-700">
            New password
            <input
              className="rounded-md border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-600"
              minLength={8}
              name="password"
              placeholder="New password"
              required
              type="password"
            />
          </label>
          {params.error ? <p className="text-sm font-bold text-red-700">{params.error}</p> : null}
          <button className="rounded-md bg-emerald-700 px-4 py-3 font-black text-white hover:bg-emerald-800">
            Update password
          </button>
        </form>
      </section>
    </main>
  );
}
