import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ease } from './ui';

// Parents keep using: {open && <Modal title onClose>...</Modal>}
// The modal animates out first, then calls onClose.
export default function Modal({ title, onClose, children }) {
  const [show, setShow] = useState(true);
  const close = () => setShow(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setShow(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <AnimatePresence onExitComplete={onClose}>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 bg-[#061b1a]/55 backdrop-blur-sm p-3 sm:p-6 grid place-items-center"
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
            className="bg-white w-full max-w-2xl max-h-[90vh] overflow-auto rounded-3xl shadow-[0_30px_80px_-20px_rgba(6,27,26,0.5)] ring-1 ring-black/5"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.32, ease }}
          >
            <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white/95 backdrop-blur z-10">
              <h2 className="font-display text-2xl">{title}</h2>
              <button
                className="btn btn-ghost !p-2 !rounded-full"
                onClick={close}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>
            <div className="p-6">{children}</div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}