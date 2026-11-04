import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LockKeyhole, HeartHandshake, ArrowRight } from 'lucide-react';
import { Logo, ease } from '../components/ui';

const steps = [
  ['01', 'Scan your hub or department QR', 'Open the official ALI-CARE reporting link.'],
  [
    '02',
    'Verify your Employee ID',
    'Your ID is used to enforce the daily submission limit and is not displayed to administrators.',
  ],
  [
    '03',
    'Describe your concern',
    'Choose who the concern is about, select severity, and explain what happened.',
  ],
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--paper)]">
      <div className="blob -top-48 -right-32 h-[34rem] w-[34rem] bg-teal-300" style={{ opacity: 0.4 }} />
      <div className="blob top-1/2 -left-48 h-[30rem] w-[30rem] bg-emerald-200" style={{ opacity: 0.45, animationDelay: '-7s' }} />

      <header className="sticky top-0 z-20 border-b border-transparent bg-[color:var(--paper)]/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex gap-3 items-center">
            <Logo size={40} />
            <div className="font-extrabold text-xl">ALI-CARE</div>
          </div>
          <Link className="btn btn-muted" to="/login">
            Staff sign in
          </Link>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-5 pt-10 sm:pt-16 pb-24 grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
        <div>
          <motion.div
            className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-teal-800 ring-1 ring-teal-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            <LockKeyhole size={16} /> A confidential reporting channel
          </motion.div>

          <h1 className="font-display text-6xl sm:text-[88px] leading-[0.95] mt-7">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease, delay: 0.1 }}
            >
              Your voice matters.
            </motion.span>
            <motion.span
              className="block text-teal-700 italic"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease, delay: 0.28 }}
            >
              We’re listening.
            </motion.span>
          </h1>

          <motion.p
            className="mt-7 text-slate-600 text-lg leading-relaxed max-w-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
          >
            A secure way for Arrowgo-Logistics employees to raise concerns and help build a safer, more respectful
            workplace.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.7 }}
          >
            <a className="btn btn-primary !py-3.5 !px-6 group" href="#how">
              How to submit a concern
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </a>
            <Link className="btn btn-muted !py-3.5 !px-6" to="/login">
              Administrator portal
            </Link>
          </motion.div>

          <motion.div
            className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <div className="flex gap-2 items-center">
              <LockKeyhole size={17} /> Encrypted messages
            </div>
            <div className="flex gap-2 items-center">
              <HeartHandshake size={17} /> Respectful workplace
            </div>
          </motion.div>
        </div>

        <motion.div
          className="panel p-7 sm:p-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.35 }}
        >
          <div className="font-display text-3xl">A simple process</div>
          <div id="how" className="mt-7 space-y-7 scroll-mt-28">
            {steps.map(([n, t, d], i) => (
              <motion.div
                className="flex gap-4"
                key={n}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease, delay: 0.7 + i * 0.12 }}
              >
                <div className="relative w-12 h-12 shrink-0 grid place-items-center rounded-2xl bg-gradient-to-b from-[#14877d] to-[#0f766e] font-bold text-white shadow-[0_8px_18px_-8px_rgba(15,118,110,0.7)]">
                  {n}
                </div>
                <div>
                  <h3 className="font-bold">{t}</h3>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">{d}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="mt-8 border-t border-slate-100 pt-5 text-xs leading-relaxed text-slate-500">
            Please avoid including unnecessary sensitive personal information. Reporting is confidential, but details in a
            complaint may sometimes make the people involved infer who submitted it.
          </p>
        </motion.div>
      </main>

      <footer className="relative border-t border-[color:var(--line)] py-5 text-center text-xs text-slate-500">
        ALI-CARE · Complaint Assessment, Resolution, and Evaluation · Arrowgo-Logistics Inc.
      </footer>
    </div>
  );
}