import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Cell,
} from 'recharts';
import { ClipboardList, Layers, Building2, CalendarDays } from 'lucide-react';
import { api, messageFromError } from '../api/client';
import { PageHeader, Counter, container, item, severityStyle } from '../components/ui';

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#061b1a] px-3 py-2 text-xs text-white shadow-xl">
      <div className="text-slate-400">{label}</div>
      <div className="text-base font-bold">{payload[0].value}</div>
    </div>
  );
}

const axis = { fontSize: 12, fill: '#6b7f7e' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/complaints/dashboard')
      .then((r) => setData(r.data))
      .catch((e) => setError(messageFromError(e)));
  }, []);

  if (error) return <div className="panel p-6 text-red-700">{error}</div>;

  if (!data)
    return (
      <div>
        <div className="skeleton h-12 w-56 mb-3" />
        <div className="skeleton h-4 w-80 max-w-full mb-8" />
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32" />
          ))}
        </div>
        <div className="skeleton h-80 mt-5" />
      </div>
    );

  const stats = [
    { label: 'Visible complaints', value: data.total, icon: ClipboardList },
    { label: 'Severity levels', value: data.bySeverity.length, icon: Layers },
    { label: 'Hubs with reports', value: data.byHub.length, icon: Building2 },
    { label: 'Trend window (days)', value: 30, icon: CalendarDays },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Aggregates exclude complaints hidden by the visibility policy."
      />

      <motion.div variants={container} initial="hidden" animate="show" className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <motion.div key={label} variants={item} className="panel p-5 flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <Counter value={value} className="mt-3 block text-5xl font-extrabold tracking-tight tabular-nums" />
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <Icon size={19} />
            </span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid xl:grid-cols-2 gap-5 mt-5"
      >
        <motion.section variants={item} className="panel p-6">
          <h2 className="font-bold">Complaints by severity</h2>
          <p className="text-sm text-slate-500 mb-4">Colored by level of concern.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.bySeverity} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3eaea" />
                <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(15,118,110,0.06)' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {data.bySeverity.map((d) => (
                    <Cell key={d.label} fill={severityStyle[d.label]?.hex || '#0f766e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section variants={item} className="panel p-6">
          <h2 className="font-bold">Complaints by hub</h2>
          <p className="text-sm text-slate-500 mb-4">Where reports are coming from.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byHub} barCategoryGap="28%">
                <defs>
                  <linearGradient id="hubFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#0f766e" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3eaea" />
                <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(15,118,110,0.06)' }} />
                <Bar dataKey="value" fill="url(#hubFill)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section variants={item} className="panel p-6 xl:col-span-2">
          <h2 className="font-bold">Last 30 days</h2>
          <p className="text-sm text-slate-500 mb-4">Daily complaint volume.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.overTime}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3eaea" />
                <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0f766e"
                  strokeWidth={3}
                  fill="url(#trendFill)"
                  activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}