import Link from "next/link";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { formatDate, relationValue, riskClass } from "@/app/app/_components/format";
import { roleLabel } from "@/app/app/_components/permissions";

export default async function MissionsPage() {
  const { supabase, user, profile } = await getAuthedContext("/app/missions");
  const { data: missions, error } = await supabase
    .from("missions")
    .select(`
      id,
      mission_code,
      selected_scenario,
      status,
      started_at,
      completed_at,
      risk_level,
      progress_percent,
      mine_sites(name),
      profiles(full_name),
      reports(final_entry_decision, zones_scanned, highest_severity)
    `)
    .order("started_at", { ascending: false });

  return (
    <AppShell
      title="Mission history"
      eyebrow="Operation MOLE"
      userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`}
      role={profile?.role}
    >
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">
            <p className="font-black">Database error</p>
            <p className="mt-2 text-sm">{error.message}</p>
          </div>
        ) : !missions?.length ? (
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="font-black">No missions found</p>
            <p className="mt-2 text-sm text-stone-600">Run a persisted MOLE-01 mission from the dashboard.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white p-5">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-stone-200 text-stone-500">
                <tr>
                  <th className="py-2 pr-4">Mission code</th>
                  <th className="py-2 pr-4">Mine site</th>
                  <th className="py-2 pr-4">Scenario</th>
                  <th className="py-2 pr-4">Operator</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Started</th>
                  <th className="py-2 pr-4">Completed</th>
                  <th className="py-2 pr-4">Zones</th>
                  <th className="py-2 pr-4">Severity</th>
                  <th className="py-2 pr-4">Entry decision</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {missions.map((mission) => {
                  const report = Array.isArray(mission.reports) ? mission.reports[0] : mission.reports;
                  return (
                    <tr key={mission.id} className="border-b border-stone-100 last:border-0">
                      <td className="py-3 pr-4 font-bold">{mission.mission_code}</td>
                      <td className="py-3 pr-4">{relationValue(mission.mine_sites, "name")}</td>
                      <td className="py-3 pr-4">{mission.selected_scenario ?? "standard_sweep"}</td>
                      <td className="py-3 pr-4">{relationValue(mission.profiles, "full_name")}</td>
                      <td className="py-3 pr-4">{mission.status}</td>
                      <td className="py-3 pr-4">{formatDate(mission.started_at)}</td>
                      <td className="py-3 pr-4">{formatDate(mission.completed_at)}</td>
                      <td className="py-3 pr-4">{report?.zones_scanned ?? "Pending"}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${riskClass(report?.highest_severity ?? mission.risk_level)}`}>
                          {report?.highest_severity ?? mission.risk_level}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{report?.final_entry_decision ?? "Pending report"}</td>
                      <td className="py-3">
                        <Link className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-bold text-white" href={`/app/missions/${mission.id}`}>
                          View Mission
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}

