"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { controlMission } from "./actions";

type Mission = {
  id: string;
  mission_code: string;
  title: string;
  status: string;
  risk_level: string;
  progress_percent: number;
  drone_id: string | null;
};

type Zone = {
  id: string;
  visit_order: number;
  status: string;
  mine_zones?: { code?: string; name?: string; map_coordinates?: { x?: number; y?: number } } | Array<{ code?: string; name?: string; map_coordinates?: { x?: number; y?: number } }>;
};

type Reading = {
  id: string;
  reading_value: number;
  unit: string;
  risk_level: string;
  recorded_at: string;
  drone_sensors?: { label?: string } | Array<{ label?: string }>;
};

type Alert = {
  id: string;
  title: string;
  risk_level: string;
  status: string;
  created_at: string;
};

type Event = {
  id: string;
  event_type: string;
  summary: string;
  created_at: string;
};

type Drone = {
  id: string;
  drone_code: string;
  status: string;
  battery_percent: number;
  signal_percent: number;
};

function relationLabel<T extends Record<string, unknown>>(value: T | T[] | null | undefined, key: keyof T) {
  const item = Array.isArray(value) ? value[0] : value;
  return item?.[key] ? String(item[key]) : "Unknown";
}

function timeLabel(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

export function LiveMissionClient({
  initialMission,
  initialZones,
  initialReadings,
  initialAlerts,
  initialEvents,
  initialDrone,
  canControl,
}: {
  initialMission: Mission;
  initialZones: Zone[];
  initialReadings: Reading[];
  initialAlerts: Alert[];
  initialEvents: Event[];
  initialDrone: Drone | null;
  canControl: boolean;
}) {
  const [mission, setMission] = useState(initialMission);
  const [zones, setZones] = useState(initialZones);
  const [readings, setReadings] = useState(initialReadings);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [events, setEvents] = useState(initialEvents);
  const [drone, setDrone] = useState(initialDrone);
  const [connection, setConnection] = useState<"Connecting" | "Live" | "Reconnecting" | "Offline">("Connecting");

  useEffect(() => {
    const supabase = createClient();
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    async function refreshMission() {
      const [missionResult, zonesResult, readingsResult, alertsResult, eventsResult, droneResult] = await Promise.all([
        supabase.from("missions").select("id, mission_code, title, status, risk_level, progress_percent, drone_id").eq("id", mission.id).maybeSingle(),
        supabase.from("mission_zones").select("id, visit_order, status, mine_zones(code, name, map_coordinates)").eq("mission_id", mission.id).order("visit_order"),
        supabase
          .from("sensor_readings")
          .select("id, reading_value, unit, risk_level, recorded_at, drone_sensors(label)")
          .eq("mission_id", mission.id)
          .order("recorded_at", { ascending: false })
          .limit(6),
        supabase.from("alerts").select("id, title, risk_level, status, created_at").eq("mission_id", mission.id).order("created_at", { ascending: false }),
        supabase.from("mission_events").select("id, event_type, summary, created_at").eq("mission_id", mission.id).order("created_at", { ascending: false }).limit(12),
        mission.drone_id ? supabase.from("drones").select("id, drone_code, status, battery_percent, signal_percent").eq("id", mission.drone_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      if (missionResult.data) setMission(missionResult.data);
      if (zonesResult.data) setZones(zonesResult.data);
      if (readingsResult.data) setReadings(readingsResult.data);
      if (alertsResult.data) setAlerts(alertsResult.data);
      if (eventsResult.data) setEvents(eventsResult.data);
      if (droneResult.data) setDrone(droneResult.data);
    }

    const channel = supabase
      .channel(`live-mission-${mission.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "missions", filter: `id=eq.${mission.id}` }, () => void refreshMission())
      .on("postgres_changes", { event: "*", schema: "public", table: "mission_zones", filter: `mission_id=eq.${mission.id}` }, () => void refreshMission())
      .on("postgres_changes", { event: "*", schema: "public", table: "sensor_readings", filter: `mission_id=eq.${mission.id}` }, () => void refreshMission())
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `mission_id=eq.${mission.id}` }, () => void refreshMission())
      .on("postgres_changes", { event: "*", schema: "public", table: "mission_events", filter: `mission_id=eq.${mission.id}` }, () => void refreshMission());

    if (mission.drone_id) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "drones", filter: `id=eq.${mission.drone_id}` }, () => void refreshMission());
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") setConnection("Live");
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setConnection("Reconnecting");
        reconnectTimer = setTimeout(() => setConnection("Offline"), 5000);
      }
      if (status === "CLOSED") setConnection("Offline");
    });

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      void supabase.removeChannel(channel);
    };
  }, [mission.id, mission.drone_id]);

  const currentZone = zones[zones.length - 1];
  const routePoints = useMemo(() => zones.map((zone, index) => ({ x: 12 + index * 16, y: 70 - index * 9, label: relationLabel(zone.mine_zones, "code") })), [zones]);

  return (
    <div className="space-y-6">
      <article className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold text-stone-500">Realtime mission telemetry</p>
            <h2 className="mt-2 text-3xl font-black">{mission.mission_code}</h2>
            <p className="mt-1 text-sm text-stone-600">{mission.title} - {mission.status}</p>
          </div>
          <span className={`w-fit rounded-md border px-3 py-1 text-sm font-bold ${connection === "Live" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            {connection}
          </span>
        </div>
        {connection !== "Live" ? <p className="mt-3 text-sm font-bold text-amber-700">Realtime is not connected. The latest visible data is kept on screen.</p> : null}
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${mission.progress_percent}%` }} />
        </div>
        <p className="mt-2 text-sm font-bold text-stone-600">{mission.progress_percent}% complete - current zone {currentZone ? relationLabel(currentZone.mine_zones, "code") : "Not entered"}</p>
      </article>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm font-bold text-stone-500">Underground tunnel map</p>
          <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-md border border-stone-200 bg-stone-950">
            <div className="absolute inset-x-8 top-1/2 h-2 -translate-y-1/2 rounded-full bg-stone-700" />
            <div className="absolute left-[20%] top-[28%] h-2 w-[45%] rotate-[-18deg] rounded-full bg-stone-700" />
            <div className="absolute left-[42%] top-[55%] h-2 w-[35%] rotate-[24deg] rounded-full bg-stone-700" />
            {routePoints.map((point, index) => (
              <div key={`${point.label}-${index}`} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
                <div className={`grid h-9 w-9 place-items-center rounded-full border text-xs font-black ${index === routePoints.length - 1 ? "border-emerald-300 bg-emerald-500 text-white" : "border-stone-500 bg-stone-800 text-stone-200"}`}>
                  {point.label}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-stone-600">Travelled route and scanned zones update from mission zone events.</p>
        </article>

        <article className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm font-bold text-stone-500">Live battery and signal</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-sm text-stone-500">Battery</p>
              <p className="text-3xl font-black">{drone?.battery_percent ?? "?"}%</p>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-sm text-stone-500">Signal</p>
              <p className="text-3xl font-black">{drone?.signal_percent ?? "?"}%</p>
            </div>
          </div>
          {canControl ? (
            <div className="mt-5 grid grid-cols-2 gap-2">
              {[
                ["pause", "Pause"],
                ["resume", "Resume"],
                ["return_to_base", "Return to Base"],
                ["emergency_recall", "Emergency Recall"],
              ].map(([action, label]) => (
                <form key={action} action={controlMission}>
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input type="hidden" name="action" value={action} />
                  <button className="w-full rounded-md border border-stone-300 px-3 py-2 text-xs font-bold">{label}</button>
                </form>
              ))}
            </div>
          ) : <p className="mt-4 text-sm font-bold text-stone-600">Read-only live monitoring</p>}
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm font-bold text-stone-500">Latest six core readings</p>
          <div className="mt-4 space-y-3">
            {readings.map((reading) => (
              <div key={reading.id} className="border-b border-stone-100 pb-3 text-sm last:border-0">
                <p className="font-bold">{relationLabel(reading.drone_sensors, "label")} - {Number(reading.reading_value).toLocaleString()} {reading.unit}</p>
                <p className="text-stone-600">{reading.risk_level} - {timeLabel(reading.recorded_at)}</p>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm font-bold text-stone-500">Active alerts</p>
          <div className="mt-4 space-y-3">
            {alerts.filter((alert) => alert.status !== "resolved").map((alert) => (
              <div key={alert.id} className="border-b border-stone-100 pb-3 text-sm last:border-0">
                <p className="font-bold">{alert.title}</p>
                <p className="text-stone-600">{alert.risk_level} - {alert.status}</p>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm font-bold text-stone-500">Mission event log</p>
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <div key={event.id} className="border-b border-stone-100 pb-3 text-sm last:border-0">
                <p className="font-bold">{event.event_type}</p>
                <p className="text-stone-600">{event.summary} - {timeLabel(event.created_at)}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
