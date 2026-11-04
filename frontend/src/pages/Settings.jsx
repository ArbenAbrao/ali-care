import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, messageFromError } from '../api/client';
import { Download, RefreshCw, Plus, QrCode, UserCog, ScrollText } from 'lucide-react';
import Modal from '../components/Modal';
import { PageHeader, ease } from '../components/ui';

const allTabs = [
  ['qr', 'QR Codes', QrCode, false],
  ['accounts', 'Accounts Management', UserCog, true],
  ['logs', 'Access Logs', ScrollText, true],
];

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
  const [error, setError] = useState('');

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
      if (!w) return;
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
                className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#14877d] to-[#0f766e] shadow-[0_8px_18px_-8px_rgba(15,118,110,0.7)]"
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
              <section className="panel p-6">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="font-bold text-lg">Hub QR codes</h2>
                  <button className="btn btn-muted" onClick={load}>
                    <RefreshCw size={16} /> Refresh
                  </button>
                </div>
                {qr.hubs.map((h) => qrRow(h.id, h.name, 'QR links to hub-specific employee reporting', () => makeQr('hub', h.id)))}
              </section>
              <section className="panel p-6">
                <h2 className="font-bold text-lg mb-2">Department QR codes</h2>
                {qr.departments.map((d) => qrRow(d.id, d.name, d.hub_name, () => makeQr('department', d.id)))}
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
                    {accounts.map((a) => (
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
              </div>
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
                    {logs.map((l) => (
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
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      {modal && (
        <Modal title="Create account" onClose={() => setModal(false)}>
          <form onSubmit={createAccount} className="space-y-4">
            <label className="block">
              <span className="label">Email or username</span>
              <input
                className="field"
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="label">Initial password (12+ characters)</span>
              <input
                className="field"
                type="password"
                minLength={12}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="label">Role</span>
              <select
                className="field"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option>Admin</option>
                <option>Superadmin</option>
              </select>
            </label>
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <span className="label">Employee record (required)</span>
              <p className="text-xs text-slate-500 mb-2">
                Admins and superadmins are employees too. This record lets staff report them, and
                hides those complaints from the reported account.
              </p>
              <div className="flex gap-2 mb-3">
                {[
                  ['existing', 'Use existing record'],
                  ['new', 'Create new record'],
                ].map(([v, t]) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setForm({ ...form, linkMode: v })}
                    className={`btn ${form.linkMode === v ? 'btn-primary' : 'btn-muted'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {form.linkMode === 'existing' ? (
                <select
                  className="field"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  required
                >
                  <option value="">Select employee…</option>
                  {lookups.employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-3">
                  <input
                    className="field"
                    placeholder="Employee ID"
                    value={form.newEmployee.employeeCode}
                    onChange={(e) => setForm({ ...form, newEmployee: { ...form.newEmployee, employeeCode: e.target.value } })}
                    required
                  />
                  <input
                    className="field"
                    placeholder="Full name (Last, First)"
                    value={form.newEmployee.name}
                    onChange={(e) => setForm({ ...form, newEmployee: { ...form.newEmployee, name: e.target.value } })}
                    required
                  />
                  <select
                    className="field"
                    value={form.newEmployee.hubId}
                    onChange={(e) => setForm({ ...form, newEmployee: { ...form.newEmployee, hubId: e.target.value, departmentId: '' } })}
                    required
                  >
                    <option value="">Hub…</option>
                    {lookups.hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="field"
                    value={form.newEmployee.departmentId}
                    onChange={(e) => setForm({ ...form, newEmployee: { ...form.newEmployee, departmentId: e.target.value } })}
                    required
                  >
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
              )}
            </div>
            <button className="btn btn-primary w-full">Create account</button>
          </form>
        </Modal>
      )}
      {linkTarget && (
        <Modal title={`Link ${linkTarget.login || 'account #' + linkTarget.id} to an employee`} onClose={() => setLinkTarget(null)}>
          <form onSubmit={linkExisting} className="space-y-4">
            <select
              className="field"
              value={linkEmployeeId}
              onChange={(e) => setLinkEmployeeId(e.target.value)}
              required
            >
              <option value="">Select employee…</option>
              {lookups.employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
            <button className="btn btn-primary w-full">Save link</button>
          </form>
        </Modal>
      )}
    </div>
  );
}