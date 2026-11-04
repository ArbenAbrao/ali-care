import React, { Suspense, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Lock,
} from 'lucide-react';
import { api } from '../api/client';
import { Logo, ease } from '../components/ui';

const links = [
  ['/app', 'Dashboard', LayoutDashboard],
  ['/app/complaints', 'Complaints', ClipboardList],
  ['/app/employees', 'Employees', Users],
  ['/app/settings', 'Settings', SettingsIcon],
];

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-12 w-64" />
      <div className="skeleton h-4 w-96 max-w-full" />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [account, setAccount] = useState(null);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();

  useEffect(() => {
    api
      .get('/auth/me')
      .then((r) => {
        if (!r.data.account) nav('/login');
        else setAccount(r.data.account);
      })
      .catch(() => nav('/login'));
  }, [nav]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      nav('/login');
    }
  }

  const current =
    links.find(([to]) => (to === '/app' ? location.pathname === '/app' : location.pathname.startsWith(to))) ||
    links[0];

  function renderSidebar(mobile) {
    const pillId = mobile ? 'nav-pill-mobile' : 'nav-pill-desktop';
    return (
      <div className="relative flex h-full flex-col overflow-hidden bg-[color:var(--sidebar)] p-4 text-white">
        <div className="blob -top-24 -left-24 h-64 w-64 bg-teal-500/40" style={{ opacity: 0.35 }} />
        <div className="blob -bottom-32 -right-20 h-72 w-72 bg-emerald-400/20" style={{ opacity: 0.3 }} />

        <div className="relative flex items-center gap-3 px-2 py-4 mb-6">
          <Logo size={42} tone="dark" />
          <div className="min-w-0">
            <div className="font-extrabold tracking-wide leading-tight">ALI-CARE</div>
            <div className="text-xs text-teal-100/60">Arrowgo-Logistics Inc.</div>
          </div>
          {mobile && (
            <button
              className="ml-auto p-2 rounded-full text-slate-300 hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="relative space-y-1">
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/app'}
              onClick={() => setOpen(false)}
              className="group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold outline-none"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId={pillId}
                      className="absolute inset-0 rounded-xl bg-white/[0.09] ring-1 ring-white/10"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    >
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-teal-300" />
                    </motion.span>
                  )}
                  <motion.span
                    className={`relative z-10 ${isActive ? 'text-teal-300' : 'text-slate-400 group-hover:text-slate-100'}`}
                    whileHover={{ scale: 1.12, rotate: -4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  >
                    <Icon size={19} />
                  </motion.span>
                  <span
                    className={`relative z-10 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="relative mt-auto border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-teal-400/15 text-sm font-bold text-teal-200 ring-1 ring-teal-300/20">
              {(account?.role || '?').charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-400">Signed in as</div>
              <div className="text-sm font-semibold truncate">{account?.role || '…'}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={19} />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:block sticky top-0 h-screen w-72 shrink-0">
        {renderSidebar(false)}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 z-40 bg-[#061b1a]/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              key="drawer"
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] md:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.35, ease }}
            >
              {renderSidebar(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[color:var(--line)] bg-white/80 px-4 backdrop-blur-xl sm:px-8">
          <button
            className="btn btn-ghost !p-2 md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="relative h-6 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current[1]}
                className="font-semibold"
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -16, opacity: 0 }}
                transition={{ duration: 0.22, ease }}
              >
                {current[1]}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
            <Lock size={13} /> Confidential workspace
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease }}
            >
              <Suspense fallback={<PageSkeleton />}>{outlet}</Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}