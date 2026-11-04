import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo, ease } from './ui';

// Route-level fallback (lazy pages)
export default function Loading() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <motion.span
            className="absolute inset-0 rounded-[18px] bg-blue-500/30"
            animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
          <Logo size={60} />
        </div>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-blue-900/10">
          <motion.div
            className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#2f5fd9] to-[#4c9f38]"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <p className="text-sm font-semibold text-slate-500">ALI-CARE is loading…</p>
      </div>
    </div>
  );
}

const messages = ['Verifying your credentials…', 'Securing your session…', 'Preparing your workspace…'];

// Full-screen overlay shown right after a successful sign-in, before navigating to /app
export function SignInOverlay() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, messages.length - 1)), 650);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[90] grid place-items-center overflow-hidden bg-[color:var(--sidebar)] text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease }}
    >
      <div className="blob -top-32 -left-24 h-[28rem] w-[28rem] bg-blue-500" />
      <div className="blob -bottom-40 -right-20 h-[30rem] w-[30rem] bg-emerald-500/50" style={{ animationDelay: '-6s' }} />

      <div className="relative flex flex-col items-center gap-8">
        <div className="relative grid h-36 w-36 place-items-center">
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-300 border-r-emerald-400"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          />
          <motion.span
            className="absolute inset-3 rounded-full border border-transparent border-b-white/50"
            animate={{ rotate: -360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          >
            <Logo size={78} tone="dark" />
          </motion.div>
        </div>

        <div className="text-center">
          <div className="font-display text-4xl">Welcome back</div>
          <div className="relative mt-3 h-5 overflow-hidden text-sm text-blue-100/70">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={i}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.25, ease }}
              >
                {messages[i]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.8, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}