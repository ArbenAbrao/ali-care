import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, messageFromError } from '../api/client';
import { Download, RefreshCw, Plus, QrCode, UserCog, ScrollText, UserPlus, UserRound, Mail, KeyRound, Eye, EyeOff, Shield, Crown, Check, Link2, ShieldCheck } from 'lucide-react';
import Modal from '../components/Modal';
import Pagination, { usePagination } from '../components/Pagination';
import { toast } from '../components/Toast';
import { PageHeader, ease } from '../components/ui';

const allTabs = [
  ['qr', 'QR Codes', QrCode, false],
  ['accounts', 'Accounts Management', UserCog, true],
  ['logs', 'Access Logs', ScrollText, true],
];

const pwStrength = (pw) =>
  (pw.length >= 12 ? 1 : 0) + (/[a-z]/.test(pw) && /[A-Z]/.test(pw) ? 1 : 0) + (/\d/.test(pw) ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);

export default function Settings() {
  const [tab, setTab] = useState('qr');
  const [role, setRole] = useState(null);
  const isSuper = role === 'Superadmin';
  // Accounts and Access Logs are Superadmin-only (the API returns 403 for Admin), so hide them for Admins.
  const tabs = allTabs.filter(([, , , superOnly]) => !superOnly || isSuper);
  const [qr, setQr] = useState({ hubs: [], departments: [] });
  const [accounts, setAccounts] = useState([]);
  const [logs, setLogs] = useState([]);
  const emptyForm = {
    login: '',
    password: '',
    role: 'Admin',
    linkMode: 'existing',
    employeeId: '',
    newEmployee: { employeeCode: '', name: '', hubId: '', departmentId: '' },
    active: true,
  };
  const [form, setForm] = useState(emptyForm);
  const [lookups, setLookups] = useState({ hubs: [], departments: [], employees: [] });
  const [linkTarget, setLinkTarget] = useState(null); // existing account being linked
  const [linkEmployeeId, setLinkEmployeeId] = useState('');
  const [modal, setModal] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const pwScore = form.password ? Math.max(1, pwStrength(form.password)) : 0;
  const [error, setError] = useState('');

  // One paginator per list so each keeps its own page.
  const hubPg = usePagination(qr.hubs, 6);
  const deptPg = usePagination(qr.departments, 6);
  const accountPg = usePagination(accounts, 10);
  const logPg = usePagination(logs, 15);

  async function load() {
    try {
      const me = await api.get('/auth/me');
      const r = me.data.account?.role || null;
      setRole(r);
      const sup = r === 'Superadmin';
      const [q, a, l, lk] = await Promise.all([
        api.get('/employee/qr'),
        sup ? api.get('/admin/accounts').catch(() => ({ data: { items: [] } })) : Promise.resolve({ data: { items: [] } }),
        sup ? api.get('/admin/access-logs').catch(() => ({ data: { items: [] } })) : Promise.resolve({ data: { items: [] } }),
        sup
          ? api.get('/complaints/lookups').catch(() => ({ data: { hubs: [], departments: [], employees: [] } }))
          : Promise.resolve({ data: { hubs: [], departments: [], employees: [] } }),
      ]);
      setLookups(lk.data);
      setQr(q.data);
      setAccounts(a.data.items);
      setLogs(l.data.items);
    } catch (e) {
      setError(messageFromError(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createAccount(e) {
    e.preventDefault();
    setError('');
    try {
      const body = { login: form.login, password: form.password, role: form.role, active: form.active };
      if (form.linkMode === 'existing') {
        if (!form.employeeId) return setError('Choose the employee record for this account.');
        body.employeeId = Number(form.employeeId);
      } else {
        const n = form.newEmployee;
        body.newEmployee = {
          employeeCode: n.employeeCode,
          name: n.name,
          hubId: Number(n.hubId),
          departmentId: Number(n.departmentId),
        };
      }
      await api.post('/admin/accounts', body);
      setModal(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      setError(messageFromError(e));
    }
  }

  async function linkExisting(e) {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/admin/accounts/${linkTarget.id}`, {
        role: linkTarget.role,
        active: !!linkTarget.active,
        employeeId: Number(linkEmployeeId),
      });
      setLinkTarget(null);
      setLinkEmployeeId('');
      load();
    } catch (e) {
      setError(messageFromError(e));
    }
  }

  async function makeQr(type, id) {
    try {
      const r = await api.post('/employee/qr', { type, id });
      const w = window.open('', '_blank', 'width=420,height=500');
      if (!w) {
        toast.info('Pop-up blocked', 'Allow pop-ups for this site to view the QR code.');
        return;
      }
      w.document.write(
        `<title>ALI-CARE QR</title><div style="font:16px Arial;padding:24px;text-align:center"><h2>ALI-CARE ${type} QR</h2><p>Print and place in the designated location.</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
          r.data.url
        )}"/><p>${r.data.url}</p></div>`
      );
    } catch (e) {
      setError(messageFromError(e));
    }
  }

  const qrRow = (key, title, sub, onClick) => (
    <div
      key={key}
      className="flex items-center justify-between gap-3 border-t border-slate-100 py-4 first:border-t-0"
    >
      <div className="min-w-0">
        <b className="block truncate">{title}</b>
        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      </div>
      <button className="btn btn-primary" onClick={onClick}>
        <Download size={16} /> Generate / rotate
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader title="Settings" description="QR codes, administrator accounts, and sign-in history." />

      {error && <div className="alert-error mb-4">{error}</div>}

      <div className="mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 ring-1 ring-[color:var(--line)] shadow-sm">
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === id ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab === id && (
              <motion.span
                layoutId="settings-tab"
                className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#2f5fd9] to-[#1f46b8] shadow-[0_8px_18px_-8px_rgba(34,80,200,0.7)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <Icon size={16} className="relative z-10" />
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease }}
        >
          {tab === 'qr' && (
            <div className="space-y-5">
              <section className="panel overflow-hidden">
                <div className="flex justify-between items-center p-6 pb-2">
                  <h2 className="font-bold text-lg">Hub QR codes</h2>
                  <button
                    className="btn btn-muted"
                    onClick={async () => {
                      await load();
                      toast.info('Refreshed', 'QR code list is up to date.');
                    }}
                  >
                    <RefreshCw size={16} /> Refresh
                  </button>
                </div>
                <div className="px-6">
                  {hubPg.slice.map((h) => qrRow(h.id, h.name, 'QR links to hub-specific employee reporting', () => makeQr('hub', h.id)))}
                </div>
                <Pagination {...hubPg} onPage={hubPg.setPage} label="hubs" />
              </section>
              <section className="panel overflow-hidden">
                <h2 className="font-bold text-lg p-6 pb-2">Department QR codes</h2>
                <div className="px-6">
                  {deptPg.slice.map((d) => qrRow(d.id, d.name, d.hub_name, () => makeQr('department', d.id)))}
                </div>
                <Pagination {...deptPg} onPage={deptPg.setPage} label="departments" />
              </section>
            </div>
          )}

          {tab === 'accounts' && (
            <section className="panel overflow-hidden">
              <div className="flex justify-between items-center p-6 pb-4">
                <h2 className="font-bold text-lg">Accounts Management</h2>
                <button className="btn btn-primary" onClick={() => setModal(true)}>
                  <Plus size={16} /> Create account
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Email / username</th>
                      <th>Role</th>
                      <th>Linked employee</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountPg.slice.map((a) => (
                      <tr key={a.id}>
                        <td className="tabular-nums">{a.id}</td>
                        <td className="max-w-64 truncate">{a.login || '—'}</td>
                        <td>
                          <span className={`pill ${a.role === 'Superadmin' ? 'bg-violet-50 text-violet-700' : 'bg-teal-50 text-teal-700'}`}>
                            {a.role}
                          </span>
                        </td>
                        <td>
                          {a.employee_name || (
                            <span className="pill bg-amber-50 text-amber-700">Not linked — cannot be reported</span>
                          )}
                        </td>
                        <td>
                          <span className={`pill ${a.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {a.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {!a.employee_id && (
                            <button className="btn btn-muted" onClick={() => setLinkTarget(a)}>
                              Link employee
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {accounts.length === 0 && <div className="p-10 text-center text-slate-500">No accounts found.</div>}
              </div>
              <Pagination {...accountPg} onPage={accountPg.setPage} label="accounts" />
            </section>
          )}

          {tab === 'logs' && (
            <section className="panel overflow-hidden">
              <div className="p-6 pb-4">
                <h2 className="font-bold text-lg">Access Logs</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Authentication events only; ordinary user actions are not logged here.
                </p>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Who</th>
                      <th>Role</th>
                      <th>Event</th>
                      <th>IP</th>
                      <th>User agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logPg.slice.map((l) => (
                      <tr key={l.id}>
                        <td className="whitespace-nowrap tabular-nums">{l.created_at}</td>
                        <td>{l.account_id || 'Unknown'}</td>
                        <td>{l.role || '—'}</td>
                        <td>{l.event}</td>
                        <td className="tabular-nums">{l.ip_address}</td>
                        <td className="max-w-64 truncate">{l.user_agent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logs.length === 0 && <div className="p-10 text-center text-slate-500">No access events yet.</div>}
              </div>
              <Pagination {...logPg} onPage={logPg.setPage} label="events" />
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      {modal && (
        <Modal title="Create account" subtitle="Give someone access to ALI-CARE" icon={UserPlus} onClose={() => setModal(false)}>
          {(close) => (
            <form onSubmit={createAccount} className="space-y-5">
              <label className="block">
                <span className="label">Email or username</span>
                <span className="relative block">
                  <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="field !pl-10" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required autoComplete="off" placeholder="name@arrowgo.com" />
                </span>
              </label>

              <div>
                <label className="block">
                  <span className="label">Initial password</span>
                  <span className="relative block">
                    <KeyRound size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="field !pl-10 !pr-11"
                      type={showPw ? 'text' : 'password'}
                      minLength={12}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      autoComplete="new-password"
                      placeholder="At least 12 characters"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="grid flex-1 grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((n) => (
                      <span key={n} className={`h-1.5 rounded-full transition-colors duration-300 ${pwScore >= n ? ['', 'bg-red-400', 'bg-amber-400', 'bg-lime-500', 'bg-emerald-500'][pwScore] : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <span className="w-16 text-right text-xs font-semibold text-slate-500">
                    {form.password ? ['Too short', 'Weak', 'Okay', 'Good', 'Strong'][form.password.length < 12 ? 0 : pwScore] : ''}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">Use 12+ characters with upper and lower case, a number and a symbol.</p>
              </div>

              <div>
                <span className="label">Role</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Admin', Shield, 'Reviews complaints, manages employees and QR codes.'],
                    ['Superadmin', Crown, 'Everything an Admin can do, plus accounts and access logs.'],
                  ].map(([r, Icon, desc]) => {
                    const on = form.role === r;
                    return (
                      <button type="button" key={r} onClick={() => setForm({ ...form, role: r })} className={`relative rounded-2xl border p-4 text-left transition-all ${on ? 'border-transparent ring-2 ring-[#2f5fd9] bg-blue-50/50' : 'border-[color:var(--line)] hover:bg-slate-50'}`}>
                        <span className="flex items-center justify-between">
                          <span className={`grid h-9 w-9 place-items-center rounded-xl ${on ? 'bg-gradient-to-br from-[#2f5fd9] to-[#1f46b8] text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <Icon size={17} />
                          </span>
                          {on && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }} className="grid h-5 w-5 place-items-center rounded-full bg-[#2f5fd9] text-white">
                              <Check size={13} />
                            </motion.span>
                          )}
                        </span>
                        <span className="mt-3 block font-bold">{r}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="flex items-center gap-2">
                  <UserRound size={16} className="text-teal-700" />
                  <span className="text-sm font-bold">Employee record (required)</span>
                </div>
                <p className="mb-3 mt-1 text-xs leading-relaxed text-slate-500">
                  Admins and superadmins are employees too. This record lets staff report them, and hides those complaints from the reported account.
                </p>
                <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-200/60 p-1">
                  {[
                    ['existing', 'Use existing record'],
                    ['new', 'Create new record'],
                  ].map(([v, t]) => (
                    <button type="button" key={v} onClick={() => setForm({ ...form, linkMode: v })} className={`relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${form.linkMode === v ? 'text-slate-900' : 'text-slate-500'}`}>
                      {form.linkMode === v && <motion.span layoutId="link-mode" className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                      <span className="relative z-10">{t}</span>
                    </button>
                  ))}
                </div>
                {form.linkMode === 'existing' ? (
                  <select className="field" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required>
                    <option value="">Select employee…</option>
                    {lookups.employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-3">
                    <input className="field" placeholder="Employee ID" value={form.newEmployee.employeeCode} onChange={(e) => setForm({ ...form, newEmployee: { ...form.newEmployee, employeeCode: e.target.value } })} required />
                    <input className="field" placeholder="Full name (Last, First)" value={form.newEmployee.name} onChange={(e) => setForm({ ...form, newEmployee: { ...form.newEmployee, name: e.target.value } })} required />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select className="field" value={form.newEmployee.hubId} onChange={(e) => setForm({ ...form, newEmployee: { ...form.newEmployee, hubId: e.target.value, departmentId: '' } })} required>
                        <option value="">Hub…</option>
                        {lookups.hubs.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                      <select className="field" value={form.newEmployee.departmentId} onChange={(e) => setForm({ ...form, newEmployee: { ...form.newEmployee, departmentId: e.target.value } })} required disabled={!form.newEmployee.hubId}>
                        <option value="">Department…</option>
                        {lookups.departments
                          .filter((d) => String(d.hub_id) === String(form.newEmployee.hubId))
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" className="btn btn-muted" onClick={close}>
                  Cancel
                </button>
                <button className="btn btn-primary sm:min-w-40">Create account</button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {linkTarget && (
        <Modal title="Link to an employee" subtitle="Connect this account to an employee record" icon={Link2} size="max-w-lg" onClose={() => setLinkTarget(null)}>
          {(close) => (
            <form onSubmit={linkExisting} className="space-y-5">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 text-sm font-bold text-teal-800">
                  {(linkTarget.login || '#').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{linkTarget.login || `Account #${linkTarget.id}`}</div>
                  <div className="text-xs text-slate-500">Account #{linkTarget.id}</div>
                </div>
                <span className={`pill ${linkTarget.role === 'Superadmin' ? 'bg-violet-50 text-violet-700' : 'bg-teal-50 text-teal-700'}`}>{linkTarget.role}</span>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                <ShieldCheck size={17} className="mt-0.5 shrink-0" />
                <p className="leading-relaxed">Until it is linked, this person cannot be reported, and complaints about them cannot be hidden from their own account.</p>
              </div>
              <label className="block">
                <span className="label">Employee record</span>
                <select className="field" value={linkEmployeeId} onChange={(e) => setLinkEmployeeId(e.target.value)} required>
                  <option value="">Select employee…</option>
                  {lookups.employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" className="btn btn-muted" onClick={close}>
                  Cancel
                </button>
                <button className="btn btn-primary sm:min-w-36">Save link</button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}