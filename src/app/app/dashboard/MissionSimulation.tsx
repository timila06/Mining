"use client";

import { useMemo, useState, useTransition } from "react";
import { Play, RotateCcw, Save, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type RiskLevel = "low" | "medium" | "high" | "critical";
type ZoneStatus = "clear" | "caution" | "unsafe" | "blocked";

type DemoZone = {
  id: string;
  code: string;
  name: string;
  status: ZoneStatus;
};

type DemoSensor = {
  id: string;
  sensor_key: string;
  label: string;
  unit: string;
};

type MissionSimulationProps = {
  userId: string;
  mineSiteId: string;
  droneId: string;
  zones: DemoZone[];
  sensors: DemoSensor[];
};

type ScenarioStep = {
  zoneCode: string;
  status: ZoneStatus;
  readings: Array<{
    sensorKey: string;
    value: number;
    severity: RiskLevel;
  }>;
};

type ThresholdSetting = {
  setting_key: string;
  setting_value: {
    value?: number;
    severity_level?: RiskLevel;
    sensor_key?: string;
    comparison?: "gt" | "lt";
  };
};

type WriteResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

const scenario: ScenarioStep[] = [
  {
    zoneCode: "A1",
    status: "clear",
    readings: [
      { sensorKey: "methane", value: 1.4, severity: "low" },
      { sensorKey: "oxygen", value: 20.8, severity: "low" },
      { sensorKey: "radio_signal", value: 93, severity: "low" },
    ],
  },
  {
    zoneCode: "B2",
    status: "caution",
    readings: [
      { sensorKey: "temperature", value: 33.2, severity: "medium" },
      { sensorKey: "humidity", value: 79.1, severity: "medium" },
      { sensorKey: "methane", value: 3.9, severity: "medium" },
    ],
  },
  {
    zoneCode: "C3",
    status: "unsafe",
    readings: [
      { sensorKey: "methane", value: 7.6, severity: "critical" },
      { sensorKey: "oxygen", value: 18.4, severity: "critical" },
      { sensorKey: "lidar_clearance", value: 1.2, severity: "high" },
    ],
  },
  {
    zoneCode: "F6",
    status: "caution",
    readings: [
      { sensorKey: "radio_signal", value: 61, severity: "medium" },
      { sensorKey: "temperature", value: 30.4, severity: "low" },
      { sensorKey: "humidity", value: 73.8, severity: "low" },
    ],
  },
];

const severityRank: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function strongest(a: RiskLevel, b: RiskLevel) {
  return severityRank[a] >= severityRank[b] ? a : b;
}

function decisionFor(severity: RiskLevel) {
  if (severity === "critical" || severity === "high") return "Human entry not cleared";
  if (severity === "medium") return "Cleared with safety officer review";
  return "Cleared for controlled entry";
}

function severityForReading(reading: ScenarioStep["readings"][number], thresholds: ThresholdSetting[]) {
  const threshold = thresholds.find((item) => item.setting_value?.sensor_key === reading.sensorKey);
  if (!threshold || typeof threshold.setting_value.value !== "number") return reading.severity;

  const comparison = threshold.setting_value.comparison ?? "gt";
  const crossed = comparison === "lt" ? reading.value < threshold.setting_value.value : reading.value > threshold.setting_value.value;
  return crossed ? (threshold.setting_value.severity_level ?? reading.severity) : "low";
}

export function MissionSimulation({ userId, mineSiteId, droneId, zones, sensors }: MissionSimulationProps) {
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Ready to start a persisted MOLE-01 mission.");
  const [warning, setWarning] = useState("");
  const [missionCode, setMissionCode] = useState("");

  const zoneByCode = useMemo(() => new Map(zones.map((zone) => [zone.code, zone])), [zones]);
  const sensorByKey = useMemo(() => new Map(sensors.map((sensor) => [sensor.sensor_key, sensor])), [sensors]);

  async function safeWrite<T>(operation: PromiseLike<WriteResult<T>>) {
    const result = await operation;
    if (result.error) {
      setWarning("Mission is running, but some data could not be saved.");
      return null;
    }
    return result.data;
  }

  function startMission() {
    startTransition(async () => {
      const supabase = createClient();
      const { data: thresholdRows } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .like("setting_key", "threshold_%");
      const thresholds = (thresholdRows ?? []) as ThresholdSetting[];
      const code = `MOLE-RUN-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
      setMissionCode(code);
      setProgress(0);
      setWarning("");
      setStatus("Creating mission record...");

      const mission = await safeWrite<{ id: string }>(
        supabase
          .from("missions")
          .insert({
            mine_site_id: mineSiteId,
            drone_id: droneId,
            mission_code: code,
            title: "Persisted MOLE-01 simulation run",
            mission_type: "inspection",
            selected_scenario: "gas_and_clearance_hazard",
            status: "active",
            risk_level: "low",
            progress_percent: 0,
            started_at: new Date().toISOString(),
            created_by: userId,
          })
          .select("id")
          .single(),
      );

      if (!mission?.id) {
        setStatus("Mission is running locally, but the mission record could not be saved.");
        return;
      }

      let highestSeverity: RiskLevel = "low";
      let hazardsDetected = 0;

      await safeWrite(
        supabase.from("mission_events").insert({
          mission_id: mission.id,
          event_type: "mission_started",
          summary: `${code} started from the operator dashboard.`,
          metadata: { scenario: "gas_and_clearance_hazard", simulated: true },
          created_by: userId,
        }),
      );

      for (const [index, step] of scenario.entries()) {
        const zone = zoneByCode.get(step.zoneCode);
        if (!zone) continue;

        setStatus(`Scanning ${zone.code} - ${zone.name}...`);

        await safeWrite(
          supabase.from("mission_zones").insert({
            mission_id: mission.id,
            mine_zone_id: zone.id,
            visit_order: index + 1,
            status: step.status,
            entered_at: new Date().toISOString(),
            exited_at: new Date().toISOString(),
          }),
        );

        for (const reading of step.readings) {
          const sensor = sensorByKey.get(reading.sensorKey);
          if (!sensor) continue;

          const computedSeverity = severityForReading(reading, thresholds);
          highestSeverity = strongest(highestSeverity, computedSeverity);

          const savedReading = await safeWrite<{ id: string }>(
            supabase
              .from("sensor_readings")
              .insert({
                mission_id: mission.id,
                drone_sensor_id: sensor.id,
                mine_zone_id: zone.id,
                reading_value: reading.value,
                unit: sensor.unit,
                risk_level: computedSeverity,
                recorded_at: new Date().toISOString(),
                simulated: true,
              })
              .select("id")
              .single(),
          );

          if (computedSeverity === "high" || computedSeverity === "critical") {
            hazardsDetected += 1;
            const title = `${sensor.label} ${computedSeverity} in ${zone.code}`;
            const existingAlert = await safeWrite<{ id: string; risk_level: RiskLevel }>(
              supabase
                .from("alerts")
                .select("id, risk_level")
                .eq("mission_id", mission.id)
                .eq("mine_zone_id", zone.id)
                .eq("title", title)
                .maybeSingle(),
            );

            if (!existingAlert || existingAlert.risk_level !== computedSeverity) {
              await safeWrite(
                supabase.from("alerts").insert({
                  mission_id: mission.id,
                  mine_zone_id: zone.id,
                  sensor_reading_id: savedReading?.id ?? null,
                  title,
                  description: `${sensor.label} reached ${reading.value} ${sensor.unit} during the simulated MOLE-01 mission.`,
                  risk_level: computedSeverity,
                  status: "open",
                }),
              );
            }
          }
        }

        await safeWrite(
          supabase.from("mission_events").insert({
            mission_id: mission.id,
            event_type: "zone_scanned",
            summary: `${zone.code} scanned with ${step.status} result.`,
            metadata: { zone: zone.code, simulated: true },
            created_by: userId,
          }),
        );

        const nextProgress = Math.round(((index + 1) / scenario.length) * 100);
        setProgress(nextProgress);
        await safeWrite(
          supabase
            .from("missions")
            .update({
              progress_percent: nextProgress,
              risk_level: highestSeverity,
              status: index + 1 === scenario.length ? "completed" : "active",
              completed_at: index + 1 === scenario.length ? new Date().toISOString() : null,
            })
            .eq("id", mission.id),
        );
      }

      const finalDecision = decisionFor(highestSeverity);
      setStatus(`Mission saved. ${finalDecision}.`);
      await safeWrite(
        supabase.from("reports").insert({
          mission_id: mission.id,
          title: `${code} Mission Summary`,
          summary: `${scenario.length} zones scanned. Highest severity: ${highestSeverity}. Hazards detected: ${hazardsDetected}.`,
          recommendations:
            highestSeverity === "critical"
              ? "Keep human entry blocked and dispatch a safety officer for gas and clearance review."
              : "Review the mission log before authorizing controlled entry.",
          generated_by: userId,
          zones_scanned: scenario.length,
          highest_severity: highestSeverity,
          hazards_detected: hazardsDetected,
          final_entry_decision: finalDecision,
        }),
      );
    });
  }

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold text-stone-500">Persisted mission simulation</p>
          <h2 className="mt-2 text-2xl font-black">Run MOLE-01 and save results</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Starts a new authenticated mission, saves zone scans, simulated readings, events, alerts, and a summary report.
          </p>
        </div>
        <button
          type="button"
          onClick={startMission}
          disabled={isPending || zones.length === 0 || sensors.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {isPending ? <Save className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          {isPending ? "Saving mission" : "Start persisted run"}
        </button>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 flex flex-col gap-2 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
        <span>{status}</span>
        <span className="font-mono">{missionCode || "No mission started"}</span>
      </div>

      {warning ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{warning}</span>
        </div>
      ) : null}

      {!isPending && progress === 100 ? (
        <button
          type="button"
          onClick={() => {
            setProgress(0);
            setStatus("Ready to start another persisted MOLE-01 mission.");
            setMissionCode("");
            setWarning("");
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset panel
        </button>
      ) : null}
    </article>
  );
}
