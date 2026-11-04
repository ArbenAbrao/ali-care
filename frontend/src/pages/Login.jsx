import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api, messageFromError } from '../api/client';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Logo, ease } from '../components/ui';

export default function Login() {
  const [mode, setMode] = useState('admin');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (mode !== 'super' || pending) return;
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!siteKey) return;
    let timer;
    // The form animates in after the mode switch, so wait for the container to mount.
    const render = (tries = 0) => {
      const el = document.getElementById('ali-turnstile');
      if (el && window.turnstile) {
        el.innerHTML = '';
        window.turnstile.render(el, {
          sitekey: siteKey,
          callback: (token) => setCaptchaToken(token),
          'expired-callback': () => setCaptchaToken(''),
          'error-callback': () => setCaptchaToken(''),
        });
      } else if (tries < 40) {
        timer = setTimeout(() => render(tries + 1), 50);
      }
    };
    if (window.turnstile) {
      render();
      return () => clearTimeout(timer);
    }
    let script = document.querySelector('script[data-turnstile]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = 'true';
      document.head.appendChild(script);
    }
    const onLoad = () => render();
    script.addEventListener('load', onLoad);
    return () => {
      script.removeEventListener('load', onLoad);
      clearTimeout(timer);
    };
  }, [mode, pending]);

  async function admin(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/admin/login', { login, password });
      nav('/app');
    } catch (e) {
      setError(messageFromError(e));
    }
  }

  async function requestOtp(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/superadmin/request-otp', { email: login, captchaToken });
      setPending(true);
    } catch (e) {
      setError(messageFromError(e));
    }
  }

  async function verify(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/superadmin/verify-otp', { otp });
      nav('/app');
    } catch (e) {
      setError(messageFromError(e));
    }
  }

  const switchMode = (m) => {
    setMode(m);
    setPending(false);
    setError('');
  };

  const formKey = mode === 'admin' ? 'admin' : pending ? 'super-otp' : 'super-email';

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-white">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[color:var(--sidebar)] p-14 text-white">
        <div className="blob -top-32 -left-24 h-[28rem] w-[28rem] bg-teal-500" />
        <div className="blob -bottom-40 right-0 h-[30rem] w-[30rem] bg-emerald-400/60" style={{ animationDelay: '-6s' }} />
        <div className="blob top-1/3 left-1/2 h-64 w-64 bg-cyan-400/40" style={{ animationDelay: '-11s' }} />

        <Link to="/" className="relative flex items-center gap-3 w-fit">
          <Logo size={44} tone="dark" />
          <b className="text-xl tracking-wide">ALI-CARE</b>
        </Link>

        <div className="relative">
          <motion.h1
            className="font-display text-[72px] leading-[0.98] max-w-lg"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease }}
          >
            Care for people. Protect every concern.
          </motion.h1>
          <motion.p
            className="mt-6 max-w-md text-teal-50/70 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.35 }}
          >
            Authorized access to confidential complaint management and reporting.
          </motion.p>
        </div>

        <p className="relative text-xs text-teal-100/50">Arrowgo-Logistics Inc. · ALI-CARE</p>
      </div>

      {/* Form panel */}
      <div className="grid place-items-center p-5 sm:p-10 bg-[color:var(--paper)]">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 mb-8 transition-colors hover:text-teal-800"
          >
            <ArrowLeft size={16} /> Back to ALI-CARE
          </Link>
          <h2 className="font-display text-5xl">Staff sign in</h2>
          <p className="text-slate-500 mt-2 mb-7">Use your assigned administrator credentials.</p>

          <div className="relative flex p-1 rounded-2xl bg-white ring-1 ring-[color:var(--line)] shadow-sm mb-6">
            {[
              ['admin', 'Admin'],
              ['super', 'Superadmin'],
            ].map(([id, label]) => (
              <button
                key={id}
                className={`relative flex-1 rounded-xl p-2.5 text-sm font-semibold transition-colors ${
                  mode === id ? 'text-white' : 'text-slate-600'
                }`}
                onClick={() => switchMode(id)}
              >
                {mode === id && (
                  <motion.span
                    layoutId="login-pill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#14877d] to-[#0f766e]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                role="alert"
                className="alert-error mb-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={formKey}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease }}
            >
              {mode === 'admin' ? (
                <form onSubmit={admin} className="space-y-4">
                  <label className="block">
                    <span className="label">Email or username</span>
                    <input
                      className="field"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      required
                      autoComplete="username"
                    />
                  </label>
                  <label className="block">
                    <span className="label">Password</span>
                    <span className="relative block">
                      <input
                        className="field !pr-11"
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        onClick={() => setShowPw(!showPw)}
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                  </label>
                  <button className="btn btn-primary w-full !py-3.5">Sign in</button>
                </form>
              ) : !pending ? (
                <form onSubmit={requestOtp} className="space-y-4">
                  <label className="block">
                    <span className="label">Superadmin email</span>
                    <input
                      className="field"
                      type="email"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      required
                    />
                  </label>
                  <div>
                    <span className="label">CAPTCHA verification</span>
                    <p className="text-xs text-slate-500 mb-2">
                      Complete the Cloudflare Turnstile challenge configured for this deployment.
                    </p>
                    <div
                      id="ali-turnstile"
                      className="min-h-16 rounded-xl border border-[color:var(--line)] bg-white p-3"
                      aria-label="Cloudflare Turnstile challenge"
                    >
                      {!import.meta.env.VITE_TURNSTILE_SITE_KEY && (
                        <p className="text-sm text-amber-800">
                          Set VITE_TURNSTILE_SITE_KEY in frontend .env to enable CAPTCHA.
                        </p>
                      )}
                    </div>
                  </div>
                  <button className="btn btn-primary w-full !py-3.5">Email verification code</button>
                </form>
              ) : (
                <form onSubmit={verify} className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Enter the six-digit code sent to your registered email. It expires shortly and can only be used once.
                  </p>
                  <label className="block">
                    <span className="label">Verification code</span>
                    <input
                      className="field text-center text-2xl font-bold tracking-[.5em] !py-4"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      required
                      autoFocus
                    />
                  </label>
                  <button className="btn btn-primary w-full !py-3.5">Verify and sign in</button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}