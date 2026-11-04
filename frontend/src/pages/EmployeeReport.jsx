import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api, messageFromError } from '../api/client';
import { CheckCircle2, Check, Search, X, MapPin, ShieldCheck } from 'lucide-react';
import { Logo, Spinner, ease, severityStyle, initials } from '../components/ui';
import { toast } from '../components/Toast';
import Loading from '../components/Loading';

const levels = ['Low', 'Medium', 'High', 'Critical'];

export default function EmployeeReport() {
  const { token } = useParams();
  const [context, setContext] = useState(null);
  const [employeeId, setEmployeeId] = useState('');
  const [employee, setEmployee] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [lookups, setLookups] = useState({ employees: [] });
  const [reported, setReported] = useState([]);
  const [severity, setSeverity] = useState('Medium');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    Promise.all([api.get(`/employee/context/${token}`), api.get('/employee/reporting-lookups')])
      .then(([c, l]) => {
        setContext(c.data);
        setLookups(l.data);
      })
      .catch((e) => setError(messageFromError(e)));
  }, [token]);

  async function verify(e) {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      const r = await api.post('/employee/lookup', { employeeId });
      setEmployee(r.data.employee);
      setRemaining(r.data.remaining);
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setVerifying(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (reported.length === 0) {
      setError('Select at least one employee to report.');
      toast.info('Pick who you are reporting', 'Select at least one employee from the list.');
      return;
    }
    setBusy(true);
    try {
      const r = await api.post('/employee/submit', {
        employeeId,
        hubId: context.hub.id,
        departmentId: context.department?.id || null,
        severity,
        subject,
        message,
        reportedEmployeeIds: reported,
      });
      setSuccess(`Complaint #${r.data.complaintId} submitted. Thank you for speaking up.`);
      setRemaining(Math.max(0, (remaining ?? 2) - 1));
      setMessage('');
      setSubject('');
      setReported([]);
      setQ('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setBusy(false);
    }
  }

  const toggle = (id) => setReported((r) => (r.includes(id) ? r.filter((i) => i !== id) : [...r, id]));

  const candidates = (lookups.employees || []).filter((x) => x.full_name !== employee?.name);
  const shown = candidates.filter((x) => x.full_name.toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  const selected = candidates.filter((x) => reported.includes(x.id));

  if (!context && !error) return <Loading />;

  const step = employee ? 2 : 1;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--paper)] px-4 py-8 sm:py-12">
      <div className="blob -top-40 -right-24 h-96 w-96 bg-blue-300" style={{ opacity: 0.35 }} />
      <div className="blob -bottom-48 -left-32 h-[26rem] w-[26rem] bg-emerald-200" style={{ opacity: 0.4 }} />

      <div className="relative max-w-2xl mx-auto">
        <motion.header
          className="flex items-center gap-3 mb-6"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <Logo size={50} />
          <div>
            <h1 className="font-extrabold text-xl leading-tight">ALI-CARE</h1>
            <p className="text-sm text-slate-500">Confidential employee reporting</p>
          </div>
          <div className="ml-auto flex items-center gap-2" aria-label={`Step ${step} of 2`}>
            {[1, 2].map((n) => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  n <= step ? 'w-10 bg-gradient-to-r from-[#2f5fd9] to-[#4c9f38]' : 'w-6 bg-blue-900/15'
                }`}
              />
            ))}
          </div>
        </motion.header>

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
          {success && (
            <motion.div
              role="status"
              className="mb-4 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-200"
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
            >
              <motion.span
                initial={{ scale: 0, rotate: -60 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 14, delay: 0.1 }}
              >
                <CheckCircle2 />
              </motion.span>
              <span className="font-medium">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.section
          className="panel p-5 sm:p-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.1 }}
        >
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-teal-700 shadow-sm">
              <MapPin size={18} />
            </span>
            <div>
              <div className="text-xs text-teal-800/80">Reporting from</div>
              <div className="font-bold">
                {context?.hub?.name || 'Hub'}
                {context?.department ? ` · ${context.department.name}` : ''}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={employee ? 'report' : 'verify'}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.25, ease }}
            >
              {!employee ? (
                <form onSubmit={verify} className="space-y-4">
                  <h2 className="font-display text-3xl">Verify your Employee ID</h2>
                  <p className="text-sm text-slate-600">
                    Your ID is used to confirm active employment and enforce the daily limit. It is not displayed to
                    administrators.
                  </p>
                  <label className="block">
                    <span className="label">Employee ID</span>
                    <input
                      className="field"
                      autoComplete="off"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="Enter your Employee ID"
                    />
                  </label>
                  <button disabled={verifying} className="btn btn-primary w-full !py-3.5">
                    {verifying ? (
                      <>
                        <Spinner /> Verifying…
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={17} /> Continue securely
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={submit} className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-4 text-sm">
                    <span>
                      Verified employee: <strong>{employee.name}</strong>
                    </span>
                    <span className="text-slate-500">
                      Remaining today: <strong className="text-slate-900">{remaining}</strong> of 2
                    </span>
                  </div>

                  {remaining === 0 ? (
                    <p className="rounded-2xl bg-amber-50 p-4 text-amber-900">
                      You have reached today's complaint limit. The limit resets at 12:00 AM Manila time.
                    </p>
                  ) : (
                    <>
                      <div>
                        <span className="label">
                          Employee(s) being reported <b className="text-red-600">*</b>
                        </span>

                        <AnimatePresence initial={false}>
                          {selected.length > 0 && (
                            <motion.div
                              className="flex flex-wrap gap-2 mb-3"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              {selected.map((x) => (
                                <motion.button
                                  type="button"
                                  key={x.id}
                                  layout
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  whileHover={{ scale: 1.04 }}
                                  onClick={() => toggle(x.id)}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 py-1.5 pl-3 pr-2 text-sm font-semibold text-white"
                                >
                                  {x.full_name}
                                  <X size={14} />
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                          <input
                            className="field !pl-10"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by name"
                          />
                        </div>
                        <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-[color:var(--line)] bg-white">
                          {shown.length === 0 && <p className="p-4 text-sm text-slate-500">No employees found.</p>}
                          {shown.map((x) => {
                            const on = reported.includes(x.id);
                            return (
                              <button
                                type="button"
                                key={x.id}
                                onClick={() => toggle(x.id)}
                                className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left text-sm last:border-0 transition-colors ${
                                  on ? 'bg-teal-50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                  {initials(x.full_name)}
                                </span>
                                <span className="flex-1 font-medium">{x.full_name}</span>
                                {on && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                  >
                                    <Check size={17} className="text-teal-700" />
                                  </motion.span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <span className="mt-1.5 block text-xs text-slate-500">Select one or more employees.</span>
                      </div>

                      <div>
                        <span className="label">
                          Level of Concern <b className="text-red-600">*</b>
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Level of concern">
                          {levels.map((x) => {
                            const on = severity === x;
                            return (
                              <button
                                type="button"
                                role="radio"
                                aria-checked={on}
                                key={x}
                                onClick={() => setSeverity(x)}
                                className={`relative rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                                  on ? 'border-transparent text-white' : 'border-[color:var(--line)] bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {on && (
                                  <motion.span
                                    layoutId="severity-pick"
                                    className="absolute inset-0 rounded-xl"
                                    style={{ background: severityStyle[x].hex }}
                                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                  />
                                )}
                                <span className="relative z-10">{x}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <label className="block">
                        <span className="label">Complaint Subject (optional)</span>
                        <input
                          className="field"
                          maxLength={2000}
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Brief summary of your concern"
                        />
                      </label>

                      <label className="block">
                        <span className="label">
                          Complaint Message <b className="text-red-600">*</b>
                        </span>
                        <textarea
                          className="field min-h-40 resize-y"
                          minLength={5}
                          maxLength={20000}
                          required
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Describe what happened, when it happened, and any relevant context."
                        />
                      </label>

                      <button disabled={busy} className="btn btn-primary w-full !py-3.5">
                        {busy ? (
                          <>
                            <Spinner /> Submitting securely…
                          </>
                        ) : (
                          'Submit confidential complaint'
                        )}
                      </button>
                    </>
                  )}
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.section>

        <p className="text-xs text-slate-500 mt-4 leading-relaxed">
          Your complaint message is encrypted at rest. Please share only information relevant to the concern. If you are in
          immediate danger, contact appropriate emergency or workplace safety personnel.
        </p>
      </div>
    </div>
  );
}