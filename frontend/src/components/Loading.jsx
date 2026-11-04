import React from 'react';
import { motion } from 'framer-motion';
import { Logo } from './ui';

export default function Loading() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <motion.span
            className="absolute inset-0 rounded-[14px] bg-teal-500/30"
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
          <Logo size={52} />
        </div>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-teal-900/10">
          <motion.div
            className="h-full w-1/2 rounded-full bg-teal-600"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <p className="text-sm font-semibold text-slate-500">ALI-CARE is loading…</p>
      </div>
    </div>
  );
}