"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f3ee] px-4 text-stone-950">
      <section className="max-w-md rounded-lg border border-stone-200 bg-white p-6">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Operation MOLE</p>
        <h1 className="mt-3 text-2xl font-black">Something went wrong</h1>
        <p className="mt-2 text-sm text-stone-600">The app kept your session safe. Try again, or return to the dashboard.</p>
        <button onClick={reset} className="mt-5 rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white">
          Try again
        </button>
      </section>
    </main>
  );
}
