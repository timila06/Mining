import { notFound } from "next/navigation";
import { AppShell, getAuthedContext } from "@/app/app/_components/AppShell";
import { canRunMissions, roleLabel } from "@/app/app/_components/permissions";
import { LiveMissionClient } from "./LiveMissionClient";

export default async function LiveMissionPage({ params }: { params: Promise<{ missionId: string }> }) {
  const { missionId } = await params;
  const { supabase, user, profile } = await getAuthedContext(`/app/live-mission/${missionId}`);

  const missionResult = await supabase
    .from("missions")
    .select("id, mission_code, title, status, risk_level, progress_percent, drone_id")
    .eq("id", missionId)
    .maybeSingle();

  if (!missionResult.data) notFound();

  const [zonesResult, readingsResult, alertsResult, eventsResult, droneResult] = await Promise.all([
    supabase.from("mission_zones").select("id, visit_order, status, mine_zones(code, name, map_coordinates)").eq("mission_id", missionId).order("visit_order"),
    supabase
      .from("sensor_readings")
      .select("id, reading_value, unit, risk_level, recorded_at, drone_sensors(label)")
      .eq("mission_id", missionId)
      .order("recorded_at", { ascending: false })
      .limit(6),
    supabase.from("alerts").select("id, title, risk_level, status, created_at").eq("mission_id", missionId).order("created_at", { ascending: false }),
    supabase.from("mission_events").select("id, event_type, summary, created_at").eq("mission_id", missionId).order("created_at", { ascending: false }).limit(12),
    missionResult.data.drone_id
      ? supabase.from("drones").select("id, drone_code, status, battery_percent, signal_percent").eq("id", missionResult.data.drone_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const databaseError = missionResult.error || zonesResult.error || readingsResult.error || alertsResult.error || eventsResult.error;

  return (
    <AppShell title="Live mission" eyebrow="Operation MOLE" userLabel={`Signed in as ${profile?.full_name ?? user.email} (${roleLabel(profile?.role)})`} role={profile?.role}>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {databaseError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">{databaseError.message}</div>
        ) : (
          <LiveMissionClient
            initialMission={missionResult.data}
            initialZones={zonesResult.data ?? []}
            initialReadings={readingsResult.data ?? []}
            initialAlerts={alertsResult.data ?? []}
            initialEvents={eventsResult.data ?? []}
            initialDrone={droneResult.data}
            canControl={canRunMissions(profile?.role)}
          />
        )}
      </section>
    </AppShell>
  );
}
