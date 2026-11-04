import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { ease } from './ui';

// Tiny global store so toast.success(...) works anywhere (components, api client, etc.)
let list = [];
let uid = 0;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn(list));

function push(type, title, description, duration = 4200) {
  const t = { id: ++uid, type, title, description, duration };
  list = [...list.slice(-3), t]; // keep max 4 on screen
  emit();
  return t.id;
}

export function dismiss(id) {
  list = list.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (title, description) => push('success', title, description),
  error: (title, description) => push('error', title, description, 6000),
  info: (title, description) => push('info', title, description),
};

const kinds = {
  success: { Icon: CheckCircle2, chip: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500' },
  error: { Icon: AlertTriangle, chip: 'bg-red-50 text-red-600', bar: 'bg-red-500' },
  info: { Icon: Info, chip: 'bg-teal-50 text-teal-700', bar: 'bg-teal-500' },
};

function ToastItem({ t }) {
  const { Icon, chip, bar } = kinds[t.type];

  useEffect(() => {
    const timer = setTimeout(() => dismiss(t.id), t.duration);
    return () => clearTimeout(timer);
  }, [t.id, t.duration]);

  return (
    <motion.div
      layout
      role={t.type === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.92, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-[color:var(--line)] bg-white/95 p-4 pr-10 shadow-[0_20px_50px_-18px_rgba(10,22,64,0.45)] backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <motion.span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${chip}`}
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.08 }}
        >
          <Icon size={19} />
        </motion.span>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">{t.title}</p>
          {t.description && <p className="mt-1 text-[13px] leading-snug text-slate-500">{t.description}</p>}
        </div>
      </div>
      <button
        onClick={() => dismiss(t.id)}
        aria-label="Dismiss notification"
        className="absolute right-2.5 top-2.5 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <X size={15} />
      </button>
      <span
        className={`toast-bar absolute inset-x-0 bottom-0 h-[3px] ${bar}`}
        style={{ '--toast-ms': `${t.duration}ms` }}
      />
    </motion.div>
  );
}

export function Toaster() {
  const [items, setItems] = useState(list);
  useEffect(() => {
    subs.add(setItems);
    return () => subs.delete(setItems);
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-3 sm:left-auto sm:right-5 sm:top-5 sm:w-96"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <ToastItem key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}