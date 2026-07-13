"use client";

import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  CloudFog,
  Download,
  Gauge,
  Lock,
  Map,
  Radio,
  ShieldCheck,
  Thermometer,
  Users,
  Waves,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const sensorData = [
  { time: "19:12", co: 18, methane: 1.1, dust: 38, oxygen: 20.7 },
  { time: "19:15", co: 21, methane: 1.4, dust: 44, oxygen: 20.4 },
  { time: "19:18", co: 29, methane: 1.8, dust: 51, oxygen: 20.1 },
  { time: "19:21", co: 34, methane: 2.2, dust: 63, oxygen: 19.8 },
  { time: "19:24", co: 31, methane: 2.0, dust: 58, oxygen: 19.9 },
  { time: "19:27", co: 37, methane: 2.6, dust: 69, oxygen: 19.5 },
];

const alerts = [
  ["Critical", "Carbon monoxide above safe limit", "Tunnel B-04", "19:27"],
  ["High", "Dust concentration rising", "Crusher access drift", "19:24"],
  ["Medium", "Humidity may reduce visibility", "Sump corridor", "19:18"],
  ["Resolved", "Signal reflection corrected", "Relay bend C", "19:05"],
];

const missions = [
  ["OM-TH-0713", "Mae Moh test tunnel", "82%", "Unsafe until reviewed"],
  ["OM-TH-0709", "Ventilation audit", "100%", "Cleared with caution"],
  ["OM-TH-0702", "Post-blast inspection", "100%", "Unsafe pocket found"],
];

const thresholds = [
  ["Oxygen", "19.5-23.5%", "19.5%", "border-emerald-500"],
  ["Carbon monoxide", "< 25 ppm", "37 ppm", "border-red-500"],
  ["Methane", "< 5% LEL", "2.6% LEL", "border-amber-500"],
  ["Dust PM", "< 50 ug/m3", "69 ug/m3", "border-red-500"],
];

function StatusPill({ children, tone }: { children: string; tone: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {children}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-stone-950">{value}</p>
        </div>
        <span className={`rounded-md p-2 ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-sm text-stone-600">{detail}</p>
    </article>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f3ee] text-stone-950">
      <nav className="sticky top-0 z-20 border-b border-stone-200 bg-[#f5f3ee]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#home" className="flex items-center gap-3" aria-label="Operation MOLE home">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-stone-950 text-white">
              <Radio className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                Diversity Hires
              </span>
              <span className="block text-lg font-black">Operation MOLE</span>
            </span>
          </a>
          <div className="hidden items-center gap-5 text-sm font-semibold text-stone-600 lg:flex">
            <a href="#solution">Solution</a>
            <a href="#dashboard">Dashboard</a>
            <a href="#sensors">Sensors</a>
            <a href="#map">Map</a>
            <a href="#reports">Reports</a>
          </div>
          <a
            href="#login"
            className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            Operator Login
          </a>
        </div>
      </nav>

      <section id="home" className="border-b border-stone-200 bg-stone-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:py-16">
          <div className="flex flex-col justify-center">
            <StatusPill tone="bg-amber-300 text-stone-950">Student prototype with simulated sensor data</StatusPill>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
              Operation MOLE: Mining Operation Lethality Explorer
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-300">
              A smart underground mine inspection application for Thailand, built around one long-range autonomous
              drone that surveys tunnels before workers enter hazardous areas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="rounded-md bg-emerald-500 px-5 py-3 text-sm font-bold text-stone-950" href="#dashboard">
                View control room
              </a>
              <a className="rounded-md border border-white/30 px-5 py-3 text-sm font-bold text-white" href="#solution">
                Explore system
              </a>
            </div>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/5 p-4">
            <div className="grid gap-3 rounded-md bg-[#101411] p-4">
              <div className="flex items-center justify-between">
                <StatusPill tone="bg-red-500 text-white">Risk elevated</StatusPill>
                <span className="font-mono text-sm text-emerald-300">OM-TH-0713 LIVE</span>
              </div>
              <div className="relative h-72 overflow-hidden rounded-md border border-emerald-400/20 bg-[#151b17]">
                <div className="absolute left-[8%] top-[24%] h-12 w-[64%] rounded-full border-2 border-stone-500/60" />
                <div className="absolute left-[42%] top-[38%] h-40 w-14 rounded-full border-2 border-stone-500/60" />
                <div className="absolute right-[12%] top-[18%] h-44 w-16 rounded-full border-2 border-stone-500/60" />
                <div className="absolute left-[55%] top-[42%] grid h-12 w-12 place-items-center rounded-full bg-emerald-400 text-stone-950 shadow-[0_0_34px_rgba(52,211,153,0.7)]">
                  <Radio className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="absolute left-[58%] top-[45%] h-24 w-24 rounded-full border border-emerald-300/40" />
                <div className="absolute left-[61%] top-[48%] h-40 w-40 rounded-full border border-emerald-300/20" />
                <div className="absolute bottom-4 left-4 rounded-md bg-red-500 px-3 py-2 text-xs font-bold">
                  CO hotspot B-04
                </div>
                <div className="absolute right-4 top-4 rounded-md bg-amber-400 px-3 py-2 text-xs font-bold text-stone-950">
                  Dust rising
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-white/10 p-3">
                  <p className="text-stone-400">Signal</p>
                  <p className="text-xl font-black">91%</p>
                </div>
                <div className="rounded-md bg-white/10 p-3">
                  <p className="text-stone-400">Battery</p>
                  <p className="text-xl font-black">68%</p>
                </div>
                <div className="rounded-md bg-white/10 p-3">
                  <p className="text-stone-400">Progress</p>
                  <p className="text-xl font-black">82%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="solution" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Thailand 4.0 safety system</p>
            <h2 className="mt-3 text-3xl font-black">One drone, long-range link, many safety decisions.</h2>
            <p className="mt-4 leading-7 text-stone-650">
              This prototype removes the earlier five-drone relay concept and focuses on one rugged inspection drone
              with extended Wi-Fi communication, environmental sensors, radiation awareness, mapping, alerts, and
              structured reports for mine control-room teams.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard icon={ShieldCheck} label="Decision goal" value="Entry clearance" detail="Decide if workers can enter a tunnel." tone="bg-emerald-100 text-emerald-800" />
            <MetricCard icon={CloudFog} label="Hazards" value="Gas + dust" detail="CO, methane, oxygen, silica dust, humidity." tone="bg-amber-100 text-amber-800" />
            <MetricCard icon={Map} label="Tunnel view" value="Mapped zones" detail="Explored, unsafe, blocked, and cleared areas." tone="bg-sky-100 text-sky-800" />
            <MetricCard icon={Users} label="Users" value="Operators" detail="Safety officers, drone pilots, managers, regulators." tone="bg-stone-200 text-stone-800" />
          </div>
        </div>
      </section>

      <section id="dashboard" className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Operations dashboard</p>
              <h2 className="mt-3 text-3xl font-black">Live mission OM-TH-0713</h2>
            </div>
            <StatusPill tone="bg-red-100 text-red-700">Human entry not cleared</StatusPill>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={BatteryCharging} label="Drone OM-01" value="68%" detail="Battery supports 21 more minutes." tone="bg-emerald-100 text-emerald-800" />
            <MetricCard icon={Radio} label="Long-range Wi-Fi" value="91%" detail="Stable link through main tunnel." tone="bg-emerald-100 text-emerald-800" />
            <MetricCard icon={AlertTriangle} label="Open alerts" value="3" detail="One critical alert requires review." tone="bg-red-100 text-red-800" />
            <MetricCard icon={Gauge} label="Mission progress" value="82%" detail="Final branch scan in progress." tone="bg-sky-100 text-sky-800" />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-lg border border-stone-200 p-5">
              <h3 className="text-lg font-black">Hazard trend</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sensorData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="time" stroke="#78716c" />
                    <YAxis stroke="#78716c" />
                    <Tooltip />
                    <Line type="monotone" dataKey="co" stroke="#dc2626" strokeWidth={3} name="CO ppm" />
                    <Line type="monotone" dataKey="methane" stroke="#d97706" strokeWidth={3} name="Methane % LEL" />
                    <Line type="monotone" dataKey="oxygen" stroke="#059669" strokeWidth={3} name="Oxygen %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article className="rounded-lg border border-stone-200 p-5">
              <h3 className="text-lg font-black">Recent alerts</h3>
              <div className="mt-4 space-y-3">
                {alerts.map(([level, title, zone, time]) => (
                  <div key={title} className="rounded-md border border-stone-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <StatusPill
                        tone={
                          level === "Critical"
                            ? "bg-red-100 text-red-700"
                            : level === "High"
                              ? "bg-amber-100 text-amber-700"
                              : level === "Resolved"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-sky-100 text-sky-700"
                        }
                      >
                        {level}
                      </StatusPill>
                      <span className="font-mono text-xs text-stone-500">{time}</span>
                    </div>
                    <p className="mt-2 font-bold">{title}</p>
                    <p className="text-sm text-stone-600">{zone}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="sensors" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="text-2xl font-black">Live sensor monitoring</h2>
            <p className="mt-2 text-stone-600">
              Readings are simulated for the prototype but follow realistic safety thresholds.
            </p>
            <div className="mt-5 grid gap-3">
              {thresholds.map(([name, safe, current, border]) => (
                <div key={name} className={`rounded-md border-l-4 ${border} bg-stone-50 p-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{name}</p>
                    <p className="font-mono text-sm">{current}</p>
                  </div>
                  <p className="mt-1 text-sm text-stone-600">Safe range: {safe}</p>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-lg border border-stone-200 bg-white p-5">
            <h3 className="text-lg font-black">Dust and air-quality load</h3>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sensorData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="time" stroke="#78716c" />
                  <YAxis stroke="#78716c" />
                  <Tooltip />
                  <Area type="monotone" dataKey="dust" stroke="#0f766e" fill="#99f6e4" name="Dust ug/m3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>
      </section>

      <section id="map" className="border-y border-stone-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-lg border border-stone-200 bg-[#111712] p-5 text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">Underground tunnel map</h2>
              <Map className="h-6 w-6 text-emerald-300" aria-hidden="true" />
            </div>
            <div className="relative mt-5 h-96 overflow-hidden rounded-md border border-white/15 bg-[#192018]">
              <div className="absolute left-[7%] top-[19%] h-16 w-[72%] rounded-full border-4 border-stone-500/60" />
              <div className="absolute left-[38%] top-[31%] h-48 w-20 rounded-full border-4 border-stone-500/60" />
              <div className="absolute right-[14%] top-[18%] h-56 w-20 rounded-full border-4 border-stone-500/60" />
              <div className="absolute bottom-[18%] left-[20%] h-20 w-[50%] rounded-full border-4 border-stone-500/60" />
              <span className="absolute left-[58%] top-[43%] grid h-14 w-14 place-items-center rounded-full bg-emerald-400 text-stone-950 shadow-[0_0_28px_rgba(52,211,153,0.75)]">
                <Radio className="h-7 w-7" aria-hidden="true" />
              </span>
              <span className="absolute left-[25%] top-[24%] rounded-md bg-emerald-500 px-3 py-2 text-xs font-bold text-stone-950">
                Cleared A-02
              </span>
              <span className="absolute right-[18%] top-[25%] rounded-md bg-red-500 px-3 py-2 text-xs font-bold">
                Unsafe B-04
              </span>
              <span className="absolute bottom-[23%] left-[42%] rounded-md bg-amber-400 px-3 py-2 text-xs font-bold text-stone-950">
                Dust zone
              </span>
            </div>
          </article>
          <article className="rounded-lg border border-stone-200 bg-white p-5">
            <h3 className="text-xl font-black">Drone fleet</h3>
            <p className="mt-2 text-stone-600">The prototype uses one drone, not a five-drone relay fleet.</p>
            <div className="mt-5 space-y-4">
              <MetricCard icon={Radio} label="Drone ID" value="OM-01" detail="Long-range Wi-Fi underground inspection drone." tone="bg-emerald-100 text-emerald-800" />
              <MetricCard icon={Thermometer} label="Payload" value="8 sensors" detail="Gas, dust, radiation, temperature, humidity, visibility." tone="bg-amber-100 text-amber-800" />
              <MetricCard icon={Waves} label="Coverage" value="All zones" detail="Travels through mapped tunnel branches sequentially." tone="bg-sky-100 text-sky-800" />
            </div>
          </article>
        </div>
      </section>

      <section id="reports" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-lg border border-stone-200 bg-white p-5 lg:col-span-2">
            <h2 className="text-2xl font-black">Mission history and reports</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500">
                    <th className="py-3">Mission</th>
                    <th>Location</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {missions.map(([id, location, progress, status]) => (
                    <tr key={id} className="border-b border-stone-100">
                      <td className="py-4 font-bold">{id}</td>
                      <td>{location}</td>
                      <td>{progress}</td>
                      <td>{status}</td>
                      <td>
                        <button className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 font-bold">
                          <Download className="h-4 w-4" aria-hidden="true" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <article id="login" className="rounded-lg border border-stone-200 bg-stone-950 p-5 text-white">
            <h2 className="text-2xl font-black">Operator login</h2>
            <p className="mt-2 text-stone-300">Mock authentication screen for Administrator, Mine Operator, Safety Officer, Drone Operator, or Regulator roles.</p>
            <div className="mt-5 grid gap-3">
              <input className="rounded-md border border-white/15 bg-white/10 px-4 py-3 text-white outline-none" placeholder="name@mine.example" />
              <input className="rounded-md border border-white/15 bg-white/10 px-4 py-3 text-white outline-none" placeholder="Password" type="password" />
              <button className="rounded-md bg-emerald-500 px-4 py-3 font-black text-stone-950">Enter dashboard</button>
            </div>
            <p className="mt-4 text-xs leading-5 text-stone-400">
              Supabase authentication and stored records are planned for the next backend step after this front-end prototype is approved.
            </p>
          </article>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Operation MOLE by Diversity Hires. B2B Drone-as-a-Service / Inspection-as-a-Service prototype.</p>
          <p>Built for Thailand underground mine safety planning.</p>
        </div>
      </footer>
    </main>
  );
}
