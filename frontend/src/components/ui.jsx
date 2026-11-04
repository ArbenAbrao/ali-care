import React, { useEffect, useRef } from 'react';
import { animate, useInView } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

export const ease = [0.22, 1, 0.36, 1];

export const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};

export const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

export const severityStyle = {
  Critical: { pill: 'bg-red-50 text-red-700', bar: 'bg-red-500', hex: '#ef4444' },
  High: { pill: 'bg-orange-50 text-orange-700', bar: 'bg-orange-500', hex: '#f97316' },
  Medium: { pill: 'bg-amber-50 text-amber-700', bar: 'bg-amber-400', hex: '#f59e0b' },
  Low: { pill: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500', hex: '#10b981' },
};

export function Logo({ size = 40, tone = 'brand' }) {
  const bg =
    tone === 'brand'
      ? 'bg-gradient-to-br from-teal-500 to-teal-800 text-white shadow-[0_8px_20px_-6px_rgba(15,118,110,0.7)]'
      : 'bg-white/10 text-teal-200 ring-1 ring-white/15';
  return (
    <span
      className={`grid place-items-center shrink-0 rounded-[14px] ${bg}`}
      style={{ width: size, height: size }}
    >
      <ShieldCheck size={size * 0.5} strokeWidth={2.2} />
    </span>
  );
}

export function PageHeader({ title, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
      <div className="min-w-0">
        <h1 className="font-display text-4xl sm:text-[44px] leading-[1.05] text-[color:var(--ink)]">{title}</h1>
        {description && <p className="text-slate-500 mt-2 text-[15px] max-w-xl">{description}</p>}
      </div>
      {children && <div className="flex gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

export function Counter({ value, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, Number(value) || 0, {
      duration: 1.1,
      ease,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v).toLocaleString();
      },
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}

export function initials(name = '') {
  const clean = String(name).trim();
  if (!clean) return '?';
  const [last, first] = clean.includes(',') ? clean.split(',').map((s) => s.trim()) : [clean, ''];
  const a = (first || last).charAt(0);
  const b = first ? last.charAt(0) : (clean.split(' ')[1] || '').charAt(0);
  return (a + b).toUpperCase();
}