"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { riskClass } from "@/app/app/_components/format";
import { createClient } from "@/lib/supabase/browser";
import { markNotificationRead } from "./actions";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  severity: string;
  read_at: string | null;
  created_at: string;
  alert_id: string | null;
  mission_id: string | null;
  alerts?: { mine_zones?: { code?: string } | Array<{ code?: string }> } | Array<{ mine_zones?: { code?: string } | Array<{ code?: string }> }>;
};

function relationValue<T extends Record<string, unknown>>(relation: T | T[] | null | undefined, key: keyof T) {
  const item = Array.isArray(relation) ? relation[0] : relation;
  return item?.[key] ? String(item[key]) : "Unknown";
}

export function NotificationsRealtime({ initialRows, userId }: { initialRows: NotificationRow[]; userId: string }) {
  const [rows, setRows] = useState(initialRows);
  const [connection, setConnection] = useState<"Connecting" | "Live" | "Offline">("Connecting");

  useEffect(() => {
    const supabase = createClient();
    async function refresh() {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, severity, read_at, created_at, alert_id, mission_id, alerts(mine_zones(code))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setRows(data);
    }

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => void refresh())
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnection("Live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setConnection("Offline");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-stone-500">Notification inbox</p>
        <span className={`rounded-md border px-2 py-1 text-xs font-bold ${connection === "Live" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{connection}</span>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? <p className="text-sm text-stone-600">No notifications match the current filters.</p> : null}
        {rows.map((notification) => {
          const alert = Array.isArray(notification.alerts) ? notification.alerts[0] : notification.alerts;
          const zone = relationValue(alert?.mine_zones, "code");
          return (
            <div key={notification.id} className={`rounded-md border p-3 text-sm ${notification.read_at ? "border-stone-200" : "border-emerald-200 bg-emerald-50"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black">{notification.title}</p>
                  <p className="mt-1 text-stone-600">{notification.message}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
                    {zone !== "Unknown" ? `Zone ${zone} - ` : ""}{new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`w-fit rounded-md border px-2 py-1 text-xs font-bold ${riskClass(notification.severity)}`}>{notification.severity}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {notification.alert_id ? <Link className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-bold text-white" href={`/app/alerts/${notification.alert_id}`}>Open Alert</Link> : null}
                {notification.mission_id ? <Link className="rounded-md border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700" href={`/app/live-mission/${notification.mission_id}`}>Open Live Mission</Link> : null}
                {!notification.read_at ? (
                  <form action={markNotificationRead}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <button className="rounded-md border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700">Mark as Read</button>
                  </form>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
