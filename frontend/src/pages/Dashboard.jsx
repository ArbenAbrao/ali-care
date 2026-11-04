import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  ClipboardList,
  Building2,
  CalendarDays,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  Users,
  QrCode,
  FileText,
  Inbox,
} from 'lucide-react';
import { api, messageFromError } from '../api/client';
import { Logo, Counter, Sparkline, container, item, severityStyle, greeting, timeAgo, initials, ease } from '../components/ui';

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#0a1640] px-3 py-2 text-xs text-white shadow-xl">
      <div className="text-slate-400">{label}</div>
      <div className="text-base font-bold">{payload[0].value}</div>
    </div>
  );
}

const axis = { fontSize: 12, fill: '#6b7694' };
const sevOrder = ['Critical', 'High', 'Medium', 'Low'];

function Trend({ delta }) {
  if (delta === 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
        <Minus size={12} /> No change
      </span>
    );
  const up = delta > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${up ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
      <Icon size={12} /> {up ? '+' : ''}
      {delta} vs prev 7d
    </span>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [role, setRole] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/complaints/dashboard').then((r) => setData(r.data)).catch((e) => setError(messageFromError(e)));
    api.get('/complaints', { params: { page: 1, limit: 5 } }).then((r) => setRecent(r.data.items || [])).catch(() => {});
    api.get('/auth/me').then((r) => setRole(r.data.account?.role || '')).catch(() => {});
  }, []);

  if (error) return <div className="panel p-6 text-red-700">{error}</div>;

  if (!data)
    return (
      <div>
        <div className="skeleton h-44 mb-5" />
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-36" />
          ))}
        </div>
        <div className="skeleton h-80 mt-5" />
      </div>
    );

  const counts = Object.fromEntries(data.bySeverity.map((d) => [d.label, d.value]));
  const attention = (counts.High || 0) + (counts.Critical || 0);
  const series = data.overTime.map((d) => d.value);
  const last7 = series.slice(-7).reduce((a, b) => a + b, 0);
  const prev7 = series.slice(-14, -7).reduce((a, b) => a + b, 0);
  const donut = sevOrder.map((l) => ({ label: l, value: counts[l] || 0 })).filter((d) => d.value > 0);
  const hubs = [...data.byHub].sort((a, b) => b.value - a.value);
  const hubMax = Math.max(1, ...hubs.map((h) => h.value));
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });

  const stats = [
    { label: 'Visible complaints', value: data.total, icon: ClipboardList, spark: series, color: '#2f5fd9', foot: <span className="text-xs text-slate-500">All time, visible to you</span> },
    { label: 'Needs attention', value: attention, icon: ShieldAlert, spark: null, color: '#ef4444', tint: 'from-red-50 to-orange-50 text-red-600', foot: <span className="text-xs text-slate-500">High + Critical concerns</span> },
    { label: 'Hubs with reports', value: data.byHub.length, icon: Building2, spark: null, color: '#4c9f38', tint: 'from-emerald-50 to-lime-50 text-emerald-700', foot: <span className="text-xs text-slate-500">{hubs[0] ? `Most: ${hubs[0].label}` : 'No reports yet'}</span> },
    { label: 'Last 7 days', value: last7, icon: CalendarDays, spark: series.slice(-7), color: '#5f87f2', foot: <Trend delta={last7 - prev7} /> },
  ];

  const actions = [
    ['/app/complaints', 'Review complaints', 'Search, filter and export', FileText],
    ['/app/employees', 'Manage employees', 'Add, edit or bulk import', Users],
    ['/app/settings', 'Generate QR codes', 'Hub and department links', QrCode],
  ];

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="relative overflow-hidden rounded-[28px] bg-[color:var(--sidebar)] p-7 text-white sm:p-9"
      >
        <div className="blob -top-24 -right-10 h-72 w-72 bg-blue-500" style={{ opacity: 0.45 }} />
        <div className="blob -bottom-32 left-1/3 h-72 w-72 bg-emerald-500" style={{ opacity: 0.25, animationDelay: '-5s' }} />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-blue-100/70">{today}</p>
            <h1 className="font-display mt-2 text-4xl leading-tight sm:text-5xl">
              {greeting()}{role ? `, ${role}` : ''}.
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-blue-50/75">
              {data.total === 0
                ? 'No complaints are visible right now. New reports will appear here as soon as they come in.'
                : attention > 0
                ? `There ${data.total === 1 ? 'is' : 'are'} ${data.total} visible complaint${data.total === 1 ? '' : 's'}, and ${attention} ${attention === 1 ? 'needs' : 'need'} your attention first.`
                : `There ${data.total === 1 ? 'is' : 'are'} ${data.total} visible complaint${data.total === 1 ? '' : 's'}, and none are high priority.`}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/app/complaints" className="btn bg-white !text-[#183590] hover:bg-blue-50">
                Review complaints <ArrowUpRight size={16} />
              </Link>
              <Link to="/app/settings" className="btn border border-white/20 bg-white/10 text-white hover:bg-white/20">
                QR codes
              </Link>
            </div>
          </div>
          <div className="float hidden shrink-0 sm:block">
            <Logo size={108} tone="dark" />
          </div>
        </div>
      </motion.section>

      {/* Stat cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, spark, color, tint, foot }) => (
          <motion.div
            key={label}
            variants={item}
            whileHover={{ y: -4 }}
            className="panel flex flex-col p-5 transition-shadow hover:shadow-[0_22px_44px_-16px_rgba(10,22,64,0.35)]"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <span className={`grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br ${tint || 'from-blue-50 to-sky-50 text-teal-700'}`}>
                <Icon size={19} />
              </span>
            </div>
            <Counter value={value} className="mt-2 block text-5xl font-extrabold tracking-tight tabular-nums" />
            <div className="mt-2 h-10">{spark ? <Sparkline data={spark} color={color} /> : null}</div>
            <div className="mt-2 border-t border-slate-100 pt-3">{foot}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Severity + Hubs */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5 xl:grid-cols-2">
        <motion.section variants={item} className="panel p-6">
          <h2 className="font-bold">Severity breakdown</h2>
          <p className="mb-4 text-sm text-slate-500">How concerns are distributed by level.</p>
          {donut.length === 0 ? (
            <div className="grid h-56 place-items-center text-sm text-slate-500">No data yet</div>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="relative h-52 w-52 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="value" nameKey="label" innerRadius={64} outerRadius={92} paddingAngle={3} cornerRadius={6} stroke="none" animationDuration={900}>
                      {donut.map((d) => (
                        <Cell key={d.label} fill={severityStyle[d.label].hex} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="text-3xl font-extrabold tabular-nums">{data.total}</div>
                    <div className="text-xs text-slate-500">total</div>
                  </div>
                </div>
              </div>
              <ul className="w-full space-y-3">
                {sevOrder.map((l) => {
                  const v = counts[l] || 0;
                  const pct = data.total ? Math.round((v / data.total) * 100) : 0;
                  return (
                    <li key={l}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-semibold">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: severityStyle[l].hex }} />
                          {l}
                        </span>
                        <span className="tabular-nums text-slate-500">
                          {v} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: severityStyle[l].hex }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.9, ease, delay: 0.2 }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </motion.section>

        <motion.section variants={item} className="panel p-6">
          <h2 className="font-bold">Hub ranking</h2>
          <p className="mb-4 text-sm text-slate-500">Where reports are coming from.</p>
          {hubs.length === 0 ? (
            <div className="grid h-56 place-items-center text-sm text-slate-500">No data yet</div>
          ) : (
            <ul className="space-y-4">
              {hubs.map((h, i) => (
                <li key={h.label} className="flex items-center gap-4">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${i === 0 ? 'bg-gradient-to-br from-[#2f5fd9] to-[#1f46b8] text-white shadow-[0_8px_16px_-8px_rgba(34,80,200,0.8)]' : 'bg-slate-100 text-slate-500'}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="truncate font-semibold">{h.label}</span>
                      <span className="tabular-nums text-slate-500">{h.value}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#5f87f2] to-[#1f46b8]"
                        initial={{ width: 0 }}
                        animate={{ width: `${(h.value / hubMax) * 100}%` }}
                        transition={{ duration: 0.9, ease, delay: 0.25 + i * 0.08 }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </motion.div>

      {/* Trend + Recent */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5 xl:grid-cols-3">
        <motion.section variants={item} className="panel p-6 xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold">Last 30 days</h2>
              <p className="mb-4 text-sm text-slate-500">Daily complaint volume.</p>
            </div>
            <Trend delta={last7 - prev7} />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.overTime}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f5fd9" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2f5fd9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f5" />
                <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="value" stroke="#1f46b8" strokeWidth={3} fill="url(#trendFill)" animationDuration={1200} activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section variants={item} className="panel flex flex-col p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Recent activity</h2>
            <Link to="/app/complaints" className="text-sm font-semibold text-teal-700 hover:underline">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="grid flex-1 place-items-center py-8 text-center text-sm text-slate-500">
              <div>
                <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-700">
                  <Inbox size={20} />
                </span>
                Nothing to show yet
              </div>
            </div>
          ) : (
            <ul className="-mx-2 space-y-1">
              {recent.map((x, i) => {
                const s = severityStyle[x.severity] || severityStyle.Low;
                return (
                  <motion.li
                    key={x.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease, delay: 0.3 + i * 0.07 }}
                  >
                    <Link to="/app/complaints" className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-slate-50">
                      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {initials(x.reported_names?.split(';')[0] || '?')}
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white ${s.bar}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{x.reported_names || 'Reported employee'}</span>
                        <span className="block truncate text-xs text-slate-500">
                          #{x.id} · {x.hub_name}
                        </span>
                      </span>
                      <span className="text-xs text-slate-400">{timeAgo(x.created_at)}</span>
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </motion.section>
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-3">
        {actions.map(([to, title, sub, Icon]) => (
          <motion.div key={to} variants={item} whileHover={{ y: -4 }}>
            <Link to={to} className="panel group flex items-center gap-4 p-5 transition-shadow hover:shadow-[0_22px_44px_-16px_rgba(10,22,64,0.35)]">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#2f5fd9] to-[#1f46b8] text-white shadow-[0_10px_20px_-10px_rgba(34,80,200,0.8)]">
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{title}</span>
                <span className="block text-sm text-slate-500">{sub}</span>
              </span>
              <ArrowUpRight size={18} className="text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-teal-700" />
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}