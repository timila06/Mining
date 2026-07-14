import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, riskClass } from "./format";

export async function NotificationBell() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: notifications }, { count }] = await Promise.all([
    supabase
    .from("notifications")
    .select("id, title, severity, created_at, read_at")
    .eq("user_id", user.id)
    .is("read_at", null)
    .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);

  const unread = count ?? 0;

  return (
    <Link className="rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50" href="/app/notifications">
      Notifications {unread ? <span className={`ml-1 rounded border px-1.5 py-0.5 text-xs ${riskClass(notifications?.[0]?.severity)}`}>{unread}</span> : null}
      {notifications?.[0] ? <span className="sr-only">{notifications[0].title} {formatDate(notifications[0].created_at)}</span> : null}
    </Link>
  );
}
