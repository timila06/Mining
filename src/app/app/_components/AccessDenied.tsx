import Link from "next/link";

export function AccessDenied({ role, message }: { role?: string | null; message: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">
        <p className="text-lg font-black">Access denied</p>
        <p className="mt-2 text-sm">{message}</p>
        <p className="mt-2 text-sm">Signed-in role: {role ?? "unknown"}</p>
        <Link className="mt-4 inline-flex rounded-md bg-red-700 px-3 py-2 text-sm font-bold text-white" href="/app/dashboard">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
