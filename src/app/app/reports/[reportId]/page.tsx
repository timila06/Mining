import Link from "next/link";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { formatDate, relationValue, riskClass } from "@/app/app/_components/format";
import { canApproveSafety, roleLabel } from "@/app/app/_components/permissions";
import { submitSafetyApproval } from "../actions";
import { PrintButton } from "../PrintButton";

function relationObject<T extends Record<string, unknown>>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] : relation;
}

export default async function ReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const { supabase, user, profile } = await getAuthedContext(`/app/reports/${reportId}`);

  const { data: report, error } = await supabase
    .from("reports")
    .select(`
      id,
      title,
      summary,
      recommendations,
      generated_at,
      zones_scanned,
      highest_severity,
      hazards_detected,
      final_entry_decision,
      report_status,
      missions(id, mission_code, title, status, selected_scenario, started_at, completed_at, mine_sites(name)),
      safety_approvals(decision, comments, conditions, corrective_actions, approved_at, profiles!safety_approvals_reviewed_by_fkey(full_name))
    `)
    .eq("id", reportId)
    .maybeSingle();

  const mission = relationObject(report?.missions);
  const approval = relationObject(report?.safety_approvals);
  const missionId = typeof mission?.id === "string" ? mission.id : null;
  const [zonesResult, alertsResult] = await Promise.all([
    missionId
      ? supabase
          .from("mission_zones")
          .select("id, visit_order, status, mine_zones(code, name)")
          .eq("mission_id", missionId)
          .order("visit_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    missionId
      ? supabase
          .from("alerts")
          .select("id, title, risk_level, status, mine_zones(code)")
          .eq("mission_id", missionId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const databaseError = error || zonesResult.error || alertsResult.error;

  return (
    <AppShell
      title={report?.title ?? "Report detail"}
      eyebrow="Reports"
      userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`}
      role={profile?.role}
    >
      <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 print:max-w-none print:bg-white">
        {databaseError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">
            <p className="font-black">Database error</p>
            <p className="mt-2 text-sm">{databaseError.message}</p>
          </div>
        ) : !report ? (
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="font-black">Invalid report ID</p>
            <p className="mt-2 text-sm text-stone-600">This report does not exist or is not available to this account.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold text-stone-500">Mission summary</p>
                <h2 className="mt-2 text-3xl font-black">{report.title}</h2>
                <p className="mt-2 text-sm text-stone-600">
                  {relationValue(report.missions, "mission_code")} · {relationValue(report.missions, "selected_scenario")} · {formatDate(report.generated_at)}
                </p>
              </div>
              <PrintButton />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Highest severity</p>
                <span className={`mt-3 inline-flex rounded-md border px-3 py-1 text-sm font-bold ${riskClass(report.highest_severity)}`}>
                  {report.highest_severity}
                </span>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Hazards detected</p>
                <p className="mt-2 text-3xl font-black">{report.hazards_detected}</p>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Zones scanned</p>
                <p className="mt-2 text-3xl font-black">{report.zones_scanned}</p>
              </article>
            </div>

            <article className="rounded-lg border border-stone-200 bg-white p-5">
              <p className="text-sm font-bold text-stone-500">Final entry decision</p>
              <p className="mt-2 text-2xl font-black">{report.final_entry_decision}</p>
              <p className="mt-1 text-sm font-bold text-stone-500">Report status: {report.report_status}</p>
              {approval ? (
                <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <p className="font-black">Reviewed by {relationValue(approval.profiles, "full_name")} on {formatDate(approval.approved_at)}</p>
                  <p className="mt-1">Decision: {approval.decision}</p>
                  <p className="mt-1">Comments: {approval.comments}</p>
                  {approval.conditions ? <p className="mt-1">Conditions: {approval.conditions}</p> : null}
                  {approval.corrective_actions ? <p className="mt-1">Corrective actions: {approval.corrective_actions}</p> : null}
                </div>
              ) : null}
              <p className="mt-4 text-stone-700">{report.summary}</p>
              <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                This report contains simulated prototype data and is not a real mine safety clearance.
              </p>
            </article>

            <div className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Inspected zones</p>
                <div className="mt-4 space-y-3">
                  {(zonesResult.data ?? []).map((zone) => (
                    <div key={zone.id} className="rounded-md border border-stone-200 p-3">
                      <p className="font-bold">{zone.visit_order}. {relationValue(zone.mine_zones, "code")} · {relationValue(zone.mine_zones, "name")}</p>
                      <p className="mt-1 text-sm text-stone-600">{zone.status}</p>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-lg border border-stone-200 bg-white p-5">
                <p className="text-sm font-bold text-stone-500">Hazard summary</p>
                <div className="mt-4 space-y-3">
                  {(alertsResult.data ?? []).map((alert) => (
                    <div key={alert.id} className="rounded-md border border-stone-200 p-3">
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${riskClass(alert.risk_level)}`}>{alert.risk_level}</span>
                      <p className="mt-2 font-bold">{alert.title}</p>
                      <p className="text-sm text-stone-600">{relationValue(alert.mine_zones, "code")} · {alert.status}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <article className="rounded-lg border border-stone-200 bg-white p-5">
              <p className="text-sm font-bold text-stone-500">Recommendations</p>
              <p className="mt-2 text-stone-700">{report.recommendations ?? "No recommendations recorded."}</p>
              <Link className="mt-4 inline-flex rounded-md bg-emerald-700 px-3 py-2 text-sm font-bold text-white print:hidden" href={`/app/missions/${missionId}`}>
                View Mission
              </Link>
            </article>

            <article className="rounded-lg border border-stone-200 bg-white p-5 print:hidden">
              <p className="text-sm font-bold text-stone-500">Safety approval</p>
              {mission?.status === "active" ? (
                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                  Approval is blocked until the mission is completed.
                </p>
              ) : !canApproveSafety(profile?.role) ? (
                <p className="mt-2 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm font-bold text-stone-700">
                  Your role can view this decision but cannot approve or revise it.
                </p>
              ) : (
                <form action={submitSafetyApproval} className="mt-4 grid gap-3">
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="missionId" value={missionId ?? ""} />
                  <label className="text-sm font-bold text-stone-700">
                    Final entry decision
                    <select name="decision" required defaultValue={approval?.decision ?? report.final_entry_decision ?? "Do not enter"} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2">
                      <option>Safe to enter</option>
                      <option>Conditional entry</option>
                      <option>Restricted access</option>
                      <option>Do not enter</option>
                      <option>Emergency response required</option>
                    </select>
                  </label>
                  <label className="text-sm font-bold text-stone-700">
                    Safety comments
                    <textarea name="comments" required defaultValue={approval?.comments ?? ""} className="mt-1 min-h-24 w-full rounded-md border border-stone-300 px-3 py-2" />
                  </label>
                  <label className="text-sm font-bold text-stone-700">
                    Required corrective actions
                    <textarea name="correctiveActions" defaultValue={approval?.corrective_actions ?? ""} className="mt-1 min-h-24 w-full rounded-md border border-stone-300 px-3 py-2" />
                  </label>
                  <label className="text-sm font-bold text-stone-700">
                    Conditions for entry
                    <textarea name="conditions" defaultValue={approval?.conditions ?? ""} className="mt-1 min-h-24 w-full rounded-md border border-stone-300 px-3 py-2" />
                  </label>
                  <button className="w-fit rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white">
                    Submit approval
                  </button>
                </form>
              )}
            </article>
          </>
        )}
      </section>
    </AppShell>
  );
}

