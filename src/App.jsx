import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Rocket, CheckCircle2, Clock, Globe2, BarChart3, Zap, CalendarDays, Star } from "lucide-react";

function computeOverallPercent(phases) {
  const weights = { done: 1, inprogress: 0.5, queued: 0.25, planned: 0 };
  const items = phases.flatMap(p => p.items);
  if (!items.length) return 0;
  const score = items.reduce((a, i) => a + (weights[i.status] ?? 0), 0);
  return Math.round((score / items.length) * 100);
}

function ProgressCircle({ value = 0, size = 120, stroke = 10, label = "", done = 0, total = 0 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const o = c - (value / 100) * c;

  return (
    <div className="relative flex flex-col items-center gap-2 select-none">
      <svg width={size} height={size} className="shrink-0">
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-zinc-200" />
        <motion.circle
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: o }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className="fill-none drop-shadow-[0_0_12px_rgba(99,102,241,0.25)]"
          stroke="url(#pg)"
          strokeDasharray={c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          filter="url(#glow)"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-2xl font-extrabold text-zinc-900">{Math.round(value)}%</div>
      </div>
      {label ? <div className="text-sm font-medium text-zinc-700 mt-1">{label}</div> : null}
      <div className="text-xs text-zinc-600">
        {done}/{total} done
      </div>
    </div>
  );
}

const DEFAULT_DATA = {
  overallProgress: 40, // <- ignored for display now (we auto-calc)
  phases: [
    {
      key: "core",
      icon: "rocket",
      title: "Core (Non-Negotiable)",
      color: "from-violet-500 via-cyan-500 to-emerald-500",
      items: [
        { name: "Multi-channel, multi-location inventory sync", status: "planned" },
        { name: "Automated restock logic & supplier PO creation", status: "inprogress" },
        { name: "Reconciliation engine for all sales channels", status: "inprogress" },
        { name: "Analytics + forecasting (SKU & category)", status: "planned" },
        { name: "Role-based access with custom dashboards", status: "done" },
        { name: "AI-assisted decision support (founders & HQ)", status: "planned" }
      ]
    },
    {
      key: "delight",
      icon: "star",
      title: "Day-One Delight",
      color: "from-fuchsia-500 via-purple-500 to-pink-500",
      items: [
        { name: "Smart search across app", status: "planned" },
        { name: "In-app scanner mode (mobile/tablet)", status: "planned" },
        { name: "Drag-drop bulk uploads with inline validation", status: "planned" },
        { name: "Custom notifications (Slack/Teams/WhatsApp)", status: "inprogress" },
        { name: "Ask AI on any screen", status: "planned" },
        { name: "Visual SKU timelines", status: "planned" }
      ]
    },
    {
      key: "damn",
      icon: "zap",
      title: "The “Damn” Layer",
      color: "from-amber-400 via-orange-500 to-red-500",
      items: [
        { name: "Shift & Task Mode for warehouse/store staff", status: "planned" },
        { name: "Auto marketing assets from SKU data", status: "planned" },
        { name: "Cross-department signal handoffs", status: "planned" },
        { name: "AI leakage detection from recon history", status: "planned" },
        { name: "Founder War-Room (live global view)", status: "planned" }
      ]
    },
    {
      key: "ecosystem",
      icon: "globe",
      title: "Long-Play Ecosystem",
      color: "from-cyan-500 via-sky-500 to-indigo-500",
      items: [
        { name: "Role kits (Warehouse, Store, Social, Finance)", status: "planned" },
        { name: "Embedded marketplace intelligence", status: "planned" },
        { name: "AI product development assistant", status: "planned" },
        { name: "Supplier benchmarking & AI negotiations", status: "planned" },
        { name: "One-click regional compliance reports", status: "planned" }
      ]
    }
  ],
  todayFocus: [
    { name: "Analytics V1 (KPI tiles + 30d line)", status: "queued" },
    { name: "Workspace Settings (currency, TZ, regions, SLAs)", status: "queued" },
    { name: "Restock Autopilot – Lite+ (real suggest qty)", status: "queued" },
    { name: "Reconciliation UX polish (export, notes, filter)", status: "queued" },
    { name: "Notifications 1.5 (SMTP + daily digest)", status: "queued" }
  ],
  recentlyShipped: [
    "Auth & roles",
    "Dashboard shell (dark theme)",
    "Alerts UI (bell + list + mark-as-read)",
    "Action Center (event→task mapping)",
    "Mock adapters + Inventory table",
    "P1 notifications (webhook)",
    "SLA/Overdue chips",
    "Comments + Activity log + Auto-assign rules",
    "PO creation from Inventory + PO list/detail",
    "Inline PO status + Export CSV"
  ]
};

function useRoadmapData() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const dataUrl = url.searchParams.get("data");
    if (!dataUrl) return;
    setLoading(true);
    fetch(dataUrl, { cache: "no-store" })
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch data.json");
        return r.json();
      })
      .then(j => setData(prev => ({ ...prev, ...j })))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

const Icon = ({ name, className }) => {
  const map = {
    rocket: <Rocket className={className} />,
    star: <Star className={className} />,
    zap: <Zap className={className} />,
    globe: <Globe2 className={className} />
  };
  return map[name] || null;
};

const badge = s => {
  const map = {
    done: { label: "Done", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    inprogress: { label: "In progress", cls: "bg-sky-50 text-sky-700 border border-sky-200" },
    planned: { label: "Planned", cls: "bg-zinc-50 text-zinc-700 border border-zinc-200" },
    queued: { label: "Queued", cls: "bg-violet-50 text-violet-700 border border-violet-200" }
  };
  return map[s] ?? map.planned;
};

const spring = { type: "spring", stiffness: 120, damping: 18, mass: 0.6 };

const Card = ({ children, hover = true }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={spring}
    whileHover={hover ? { y: -2, boxShadow: "0 10px 24px -12px rgba(99,102,241,0.25)" } : undefined}
    className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
  >
    {children}
  </motion.div>
);

function phaseProgress(items) {
  return Math.round((items.filter(i => i.status !== "planned").length / items.length) * 100);
}



function countStatuses(items) {
  return {
    done: items.filter(i => i.status === "done").length,
    inprogress: items.filter(i => i.status === "inprogress").length,
    planned: items.filter(i => i.status === "planned").length
  };
}


// weights per item status (tweak if you want)
const ITEM_WEIGHTS = { done: 1, inprogress: 0.6, queued: 0.3, planned: 0 };
 
// weights per phase for overall % (must sum ~1; tweak to taste)
const PHASE_WEIGHTS = { core: 0.5, delight: 0.25, damn: 0.15, ecosystem: 0.10 };
 
// % for a single phase using ITEM_WEIGHTS
function phasePercent(items) {
  if (!items?.length) return 0;
  const score = items.reduce((a, i) => a + (ITEM_WEIGHTS[i.status] ?? 0), 0);
  return Math.round((score / items.length) * 100);
}
 
// weighted overall across phases using PHASE_WEIGHTS
function weightedOverall(phases) {
  if (!phases?.length) return 0;
  let totalW = 0;
  let acc = 0;
  for (const p of phases) {
    const w = PHASE_WEIGHTS[p.key] ?? 0;
    if (!w) continue;
    acc += w * phasePercent(p.items);
    totalW += w;
  }
  if (totalW === 0) return 0;
  return Math.round(acc / totalW);
}


export default function App() {
  const { data, loading, error } = useRoadmapData();

  // NEW: auto-calc overall % from phase item statuses
  const overall = useMemo(() => computeOverallPercent(data.phases), [data.phases]);

  const totalItems = useMemo(() => data.phases.reduce((a, p) => a + p.items.length, 0), [data]);
  const overallCounts = useMemo(() => countStatuses(data.phases.flatMap(p => p.items)), [data]);
  const doneList = useMemo(
    () => [
      ...data.phases.flatMap(p => p.items.filter(i => i.status === "done").map(i => ({ phase: p.title, name: i.name }))),
      ...data.recentlyShipped.map(n => ({ phase: "Shipped", name: n }))
    ],
    [data]
  );

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white text-zinc-900">
      {/* faint neon background accents */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute bottom-0 -right-20 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/3 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/70 px-3 py-1 text-xs text-zinc-500 shadow-sm">
              <Globe2 className="w-3.5 h-3.5" /> Global, automation-first OS for commerce
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text text-transparent">Flowventory — Vision & Roadmap</h1>
            <p className="text-zinc-500">From warehouse floor to HQ AI — one operating brain.</p>
          </div>

          <motion.div layout className="rounded-2xl p-[1px] bg-gradient-to-br from-fuchsia-500/60 via-cyan-500/60 to-emerald-500/60 shadow-[0_0_40px_-14px_rgba(99,102,241,0.35)]">
            <div className="rounded-2xl bg-white/80 backdrop-blur px-5 py-3 flex items-center gap-5">
              {/* CHANGED: use 'overall' */}
              <ProgressCircle value={overall} label="Overall" done={overallCounts.done} total={totalItems} />
              <div>
                <div className="text-sm text-zinc-500">Overall progress</div>
                {/* CHANGED: use 'overall' */}
                <div className="text-2xl font-bold">{overall}%</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Progress Rings Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <div className="flex items-center justify-center">
              {/* CHANGED: use 'overall' */}
              <ProgressCircle value={overall} label="Overall" done={overallCounts.done} total={totalItems} />
            </div>
          </Card>
          {data.phases.map(p => {
            const counts = countStatuses(p.items);
            const prog = phaseProgress(p.items);
            return (
              <Card key={p.key}>
                <div className="flex items-center justify-center">
                  <ProgressCircle value={prog} label={p.title.split(" ")[0]} done={counts.done} total={p.items.length} />
                </div>
              </Card>
            );
          })}
        </div>



        {/* Today focus & Completed */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-zinc-500" /> Today / Next Up
              </h2>
              <span className="text-xs text-zinc-500">Execution queue</span>
            </div>
            <ul className="space-y-2">
              {data.todayFocus.map(t => (
                <motion.li key={t.name} whileHover={{ x: 2 }} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-zinc-200 shadow-sm px-3 py-2">
                  <span className="text-sm md:text-base">{t.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-lg ${badge(t.status).cls}`}>{badge(t.status).label}</span>
                </motion.li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Completed (All)
              </h2>
              <span className="text-xs text-zinc-500">Across phases</span>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {doneList.length ? (
                doneList.map((d, i) => (
                  <motion.li key={i} whileHover={{ scale: 1.01 }} className="rounded-xl bg-white border border-zinc-200 shadow-sm px-3 py-2 text-sm flex items-center justify-between">
                    <span>{d.name}</span>
                    <span className="text-[11px] text-zinc-500">{d.phase}</span>
                  </motion.li>
                ))
              ) : (
                <li className="text-sm text-zinc-500">Nothing marked done yet.</li>
              )}
            </ul>
          </Card>
        </div>

        {/* Recently shipped */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-zinc-500" /> Recently Shipped
            </h2>
            <span className="text-xs text-zinc-500">Past 1–2 sprints</span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {data.recentlyShipped.map(s => (
              <motion.li key={s} whileHover={{ x: 2 }} className="rounded-xl bg-white border border-zinc-200 shadow-sm px-3 py-2 text-sm">
                {s}
              </motion.li>
            ))}
          </ul>
        </Card>

        {/* Phases */}
        <div className="grid lg:grid-cols-2 gap-6">
          {data.phases.map(phase => (
            <Card key={phase.key}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Icon name={phase.icon} className="w-4 h-4" />
                  {phase.title}
                </h3>
                <div className="h-2 w-40 rounded-full bg-zinc-200 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${phase.color}`}
                    style={{ width: `${Math.round((phase.items.filter(i => i.status !== "planned").length / phase.items.length) * 100)}%` }}
                  />
                </div>
              </div>
              <ul className="space-y-2">
                {phase.items.map(i => (
                  <motion.li key={i.name} whileHover={{ x: 2 }} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-zinc-200 shadow-sm px-3 py-2">
                    <span className="text-sm md:text-base">{i.name}</span>
                    <span className={`text-xs px-2 py-1 rounded-lg ${badge(i.status).cls}`}>{badge(i.status).label}</span>
                  </motion.li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <Card hover={false}>
          <div className="flex items-center gap-2 text-zinc-600 text-sm">
            <BarChart3 className="w-4 h-4" />
            {/* CHANGED: use 'overall' here too */}
            <span>
              Overall progress <span className="font-semibold text-zinc-800">{overall}%</span>. Share this link with devs as the single source of
              truth.
            </span>
          </div>
          {loading && <div className="text-xs text-zinc-500 mt-2">Loading data…</div>}
          {error && <div className="text-xs text-red-600 mt-2">Error: {error}</div>}
        </Card>
      </div>
    </div>
  );
}