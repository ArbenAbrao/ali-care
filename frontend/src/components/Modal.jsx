import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ease } from './ui';

// Parents keep using: {open && <Modal title onClose>...</Modal>}
// The modal animates out first, then calls onClose.
// children can be a node OR a function: (close) => node  (handy for Cancel buttons).
//
// IMPORTANT: the modal is rendered with a portal into document.body.
// AdminLayout wraps every page in a motion.div that animates `transform` and `filter`.
// Any ancestor with transform/filter becomes the containing block for `position: fixed`
// children, so `fixed inset-0` was only covering the page content area (not the sidebar
// or top bar) and was positioned relative to the scrolled page instead of the viewport.
export default function Modal({ title, subtitle, icon: Icon, onClose, children, size = 'max-w-2xl' }) {
  const [show, setShow] = useState(true);
  const close = () => setShow(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setShow(false);
    const { body, documentElement } = document;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    // Keep the layout from jumping when the page scrollbar disappears.
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    window.addEventListener('keydown', onKey);
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence onExitComplete={onClose}>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#0a1640]/55 p-3 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative flex max-h-[90vh] w-full ${size} flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(10,22,64,0.55)] ring-1 ring-black/5`}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <div className="h-1.5 w-full shrink-0 bg-gradient-to-r from-[#2f5fd9] via-[#5f87f2] to-[#4c9f38]" />
            <header className="flex shrink-0 items-center gap-4 border-b border-slate-100 bg-white px-6 py-4">
              {Icon && (
                <motion.span
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.1 }}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#2f5fd9] to-[#1f46b8] text-white shadow-[0_10px_20px_-10px_rgba(34,80,200,0.8)]"
                >
                  <Icon size={20} />
                </motion.span>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-display truncate text-2xl leading-tight">{title}</h2>
                {subtitle && <p className="truncate text-[13px] text-slate-500">{subtitle}</p>}
              </div>
              <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 sm:block">
                Esc
              </kbd>
              <button className="btn btn-ghost !rounded-full !p-2" onClick={close} aria-label="Close">
                <X size={18} />
              </button>
            </header>
            {/* Only the body scrolls, so the header and gradient bar always stay visible. */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
              {typeof children === 'function' ? children(close) : children}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}