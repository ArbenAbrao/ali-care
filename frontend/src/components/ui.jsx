import React, { useEffect, useRef } from 'react';
import { animate, useInView } from 'framer-motion';

export const ease = [0.22, 1, 0.36, 1];

export const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const item = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease } },
};

export const severityStyle = {
  Critical: { pill: 'bg-red-50 text-red-700', bar: 'bg-red-500', hex: '#ef4444' },
  High: { pill: 'bg-orange-50 text-orange-700', bar: 'bg-orange-500', hex: '#f97316' },
  Medium: { pill: 'bg-amber-50 text-amber-700', bar: 'bg-amber-400', hex: '#f59e0b' },
  Low: { pill: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500', hex: '#4c9f38' },
};

// Files live in frontend/public (LOGO1 = full brand sheet, LOGO2 = "G" icon, LOGO3 = wordmark).
// variant="icon"     -> the G mark inside a soft white tile (works on light and dark backgrounds)
// variant="wordmark" -> ARROWGO LOGISTICS INC. + tagline; `size` is the height in px
export function Logo({ size = 40, variant = 'icon', tone = 'brand', className = '' }) {
  if (variant === 'wordmark') {
    return <img src="/LOGO3.png" alt="Arrowgo Logistics Inc." style={{ height: size }} className={`w-auto ${className}`} />;
  }
  const ring = tone === 'dark' ? 'ring-1 ring-white/20 shadow-[0_8px_24px_-8px_rgba(95,135,242,0.6)]' : 'ring-1 ring-[color:var(--line)] shadow-[0_8px_20px_-8px_rgba(34,80,200,0.45)]';
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-[14px] bg-white ${ring} ${className}`}
      style={{ width: size, height: size }}
    >
      <img src="/LOGO2.png" alt="Arrowgo" style={{ width: size * 0.72, height: size * 0.72 }} className="object-contain" />
    </span>
  );
}

export function Spinner({ size = 18, className = '' }) {
  return (
    <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageHeader({ title, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div className="min-w-0">
        <h1 className="font-display text-4xl sm:text-[46px] leading-[1.05] text-[color:var(--ink)]">{title}</h1>
        <span className="mt-3 block h-1 w-14 rounded-full bg-gradient-to-r from-[#2f5fd9] to-[#4c9f38]" />
        {description && <p className="text-slate-500 mt-3 text-[15px] max-w-xl">{description}</p>}
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
      duration: 1.2,
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

export function greeting() {
  const h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Manila' }));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function timeAgo(value) {
  if (!value) return '';
  const d = new Date(String(value).replace(' ', 'T'));
  if (isNaN(d)) return String(value).slice(0, 16);
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

// Tiny animated trend line for stat cards
export function Sparkline({ data = [], color = '#2f5fd9', height = 40 }) {
  const w = 140;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * w, height - 4 - (v / max) * (height - 10)]);
  if (pts.length < 2) return null;
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${height} L0,${height} Z`;
  const id = `sp-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-10 w-full" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: 'draw 1.2s ease forwards' }} />
    </svg>
  );
}