import Link from "next/link";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { formatDate, relationValue, riskClass } from "@/app/app/_components/format";

export default async function ReportsPage() {
  const { supabase, user, profile } = await getAuthedContext("/app/reports");
  const { data: reports, error } = await supabase
    .from("reports")
    .select(`
      id,
      title,
      generated_at,
      highest_severity,
      hazards_detected,
      final_entry_decision,
      report_url,
      missions(id, mission_code, status)
    `)
    .order("generated_at", { ascending: false });

  return (
    <AppShell
      title="Reports"
      eyebrow="Operation MOLE"
      userLabel={`Signed in as ${profile?.full_name ?? user.email} ${profile?.role ? `(${profile.role})` : ""}`}
      role={profile?.role}
    >
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">
            <p className="font-black">Database error</p>
            <p className="mt-2 text-sm">{error.message}</p>
          </div>
        ) : !reports?.length ? (
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="font-black">No reports found</p>
            <p className="mt-2 text-sm text-stone-600">Run a persisted mission to generate a report.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white p-5">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-stone-200 text-stone-500">
                <tr>
                  <th className="py-2 pr-4">Report code</th>
                  <th className="py-2 pr-4">Mission code</th>
                  <th className="py-2 pr-4">Generated</th>
                  <th className="py-2 pr-4">Severity</th>
                  <th className="py-2 pr-4">Hazards</th>
                  <th className="py-2 pr-4">Entry decision</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b border-stone-100 last:border-0">
                    <td className="py-3 pr-4 font-bold">{report.title}</td>
                    <td className="py-3 pr-4">{relationValue(report.missions, "mission_code")}</td>
                    <td className="py-3 pr-4">{formatDate(report.generated_at)}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${riskClass(report.highest_severity)}`}>{report.highest_severity}</span>
                    </td>
                    <td className="py-3 pr-4">{report.hazards_detected}</td>
                    <td className="py-3 pr-4">{report.final_entry_decision ?? "Pending"}</td>
                    <td className="py-3 pr-4">{report.report_url ? "Exported" : "Draft"}</td>
                    <td className="py-3">
                      <Link className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-bold text-white" href={`/app/reports/${report.id}`}>
                        View Report
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
