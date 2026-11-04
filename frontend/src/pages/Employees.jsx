import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, messageFromError } from '../api/client';
import { Plus, Upload, Download, Edit3, Search, FileSpreadsheet, Users, UserCheck, UserX, Building2, UserPlus, UserCog, UserRound, KeyRound, Lock, MapPin } from 'lucide-react';
import Modal from '../components/Modal';
import Pagination, { usePagination } from '../components/Pagination';
import { toast } from '../components/Toast';
import { PageHeader, Spinner, Counter, container, item, ease, initials } from '../components/ui';

const blank = { employeeId: '', name: '', status: 'Active', hubId: '', departmentId: '' };
const PAGE_SIZE = 10;

export default function Employees() {
  const [items, setItems] = useState([]);
  const [lookups, setLookups] = useState({ hubs: [], departments: [] });
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const pg = usePagination(items, PAGE_SIZE);

  async function load() {
    try {
      const [e, l] = await Promise.all([
        api.get('/employee', { params: { search, limit: 100 } }),
        api.get('/complaints/lookups'),
      ]);
      setItems(e.data.items);
      setLookups(l.data);
      setError('');
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
  }, [search]);

  function edit(x) {
    setEditing(x.id);
    setForm({
      employeeId: '',
      name: x.full_name,
      status: x.status,
      hubId: String(x.hub_id),
      departmentId: String(x.department_id),
    });
    setOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, hubId: Number(form.hubId), departmentId: Number(form.departmentId) };
      if (editing) await api.put(`/employee/${editing}`, data);
      else await api.post('/employee', data);
      setOpen(false);
      setForm(blank);
      setEditing(null);
      load();
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setSaving(false);
    }
  }

  async function importFile() {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setImporting(true);
    try {
      const r = await api.post('/employee/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSummary(r.data);
      if (r.data.invalid?.length > 0)
        toast.info('Some rows were skipped', `${r.data.invalid.length} invalid row(s) — see the import summary.`);
      setFile(null);
      load();
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Employees" description="Add, edit, activate, or deactivate employee records.">
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditing(null);
            setForm(blank);
            setOpen(true);
          }}
        >
          <Plus size={17} /> Add employee
        </button>
      </PageHeader>

      {error && <div className="alert-error mb-4">{error}</div>}

      <motion.div variants={container} initial="hidden" animate="show" className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          ['Employees shown', items.length, Users, 'from-blue-50 to-sky-50 text-teal-700'],
          ['Active', items.filter((x) => x.status === 'Active').length, UserCheck, 'from-emerald-50 to-lime-50 text-emerald-700'],
          ['Inactive', items.filter((x) => x.status !== 'Active').length, UserX, 'from-slate-100 to-slate-50 text-slate-500'],
          ['Hubs', new Set(items.map((x) => x.hub_name)).size, Building2, 'from-indigo-50 to-blue-50 text-indigo-600'],
        ].map(([label, value, Icon, tint]) => (
          <motion.div key={label} variants={item} className="panel flex items-center gap-4 p-4">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${tint}`}>
              <Icon size={20} />
            </span>
            <div>
              <Counter value={value} className="block text-2xl font-extrabold tabular-nums leading-none" />
              <span className="mt-1 block text-xs text-slate-500">{label}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="panel p-5 mb-5">
        <h2 className="font-bold">Bulk import CSV / XLSX</h2>
        <p className="text-sm text-slate-500 mt-1">
          Required columns: Name, Status, Branch, Department, Employee ID. Name format: Last Name, First Name.
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 px-4 py-3 transition-all hover:bg-teal-50 hover:border-teal-400">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-teal-700 shadow-sm">
              <FileSpreadsheet size={18} />
            </span>
            <span className="min-w-0 text-sm">
              <span className="block font-semibold truncate">{file ? file.name : 'Choose a .csv or .xlsx file'}</span>
              <span className="block text-xs text-slate-500">{file ? 'Ready to import' : 'Click to browse'}</span>
            </span>
            <input
              type="file"
              accept=".csv,.xlsx"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button className="btn btn-primary" onClick={importFile} disabled={!file || importing}>
            {importing ? (
              <>
                <Spinner size={16} /> Importing…
              </>
            ) : (
              <>
                <Upload size={16} /> Import file
              </>
            )}
          </button>
          <a
            className="btn btn-muted"
            href="data:text/csv;charset=utf-8,Name%2CStatus%2CBranch%2CDepartment%2CEmployee%20ID%0A%22Santos%2C%20Maria%22%2CActive%2CMarilao%20Hub%2COperations%2C100001"
            download="ali-care-import-template.csv"
            onClick={() => toast.info('Template downloaded', 'Fill it in, then import it here.')}
          >
            <Download size={16} /> Template
          </a>
        </div>

        <AnimatePresence>
          {summary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm">
                <b className="text-emerald-900">Import summary</b>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  <div>
                    Inserted: <b>{summary.inserted}</b>
                  </div>
                  <div>
                    Updated: <b>{summary.updated}</b>
                  </div>
                  <div>
                    Duplicates skipped: <b>{summary.skippedDuplicates}</b>
                  </div>
                  <div>
                    Invalid: <b>{summary.invalid.length}</b>
                  </div>
                </div>
                {summary.invalid.length > 0 && (
                  <ul className="list-disc pl-5 mt-3 text-red-800">
                    {summary.invalid.map((x, i) => (
                      <li key={i}>
                        Row {x.row}: {x.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="panel overflow-hidden">
        <div className="relative p-4 border-b border-slate-100">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            className="field !pl-10"
            value={search}
            onChange={(e) => {
              pg.setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search employees by name"
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Hub</th>
                <th>Department</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loaded &&
                [0, 1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={5}>
                      <div className="skeleton h-6" />
                    </td>
                  </tr>
                ))}
              {pg.slice.map((x, i) => (
                <motion.tr
                  key={x.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease, delay: Math.min(i, 12) * 0.03 }}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 text-xs font-bold text-teal-800">
                        {initials(x.full_name)}
                      </span>
                      <span className="font-semibold">{x.full_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`pill ${x.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${x.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {x.status}
                    </span>
                  </td>
                  <td>{x.hub_name}</td>
                  <td>{x.department_name}</td>
                  <td className="text-right">
                    <button className="btn btn-muted !p-2" onClick={() => edit(x)} aria-label={`Edit ${x.full_name}`}>
                      <Edit3 size={15} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {loaded && items.length === 0 && <div className="p-10 text-center text-slate-500">No employees found.</div>}
        </div>
        <Pagination {...pg} onPage={pg.setPage} label="employees" />
      </div>

      {open && (
        <Modal
          title={editing ? 'Edit employee' : 'Add employee'}
          subtitle={editing ? `Updating ${form.name || 'record'}` : 'Create a new employee record'}
          icon={editing ? UserCog : UserPlus}
          onClose={() => setOpen(false)}
        >
          {(close) => (
            <form onSubmit={save} className="space-y-5">
              <div className="flex items-start gap-3 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 p-4 text-sm text-teal-900">
                <Lock size={17} className="mt-0.5 shrink-0" />
                <p className="leading-relaxed">
                  Employee IDs are stored encrypted and are never shown to administrators.
                  {editing && ' Re-enter the ID to save changes.'}
                </p>
              </div>

              <label className="block">
                <span className="label">Employee ID</span>
                <span className="relative block">
                  <KeyRound size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="field !pl-10"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    required
                    autoComplete="off"
                    placeholder={editing ? 'Re-enter Employee ID to update' : 'e.g. 100001'}
                  />
                </span>
              </label>

              <label className="block">
                <span className="label">Name (Last Name, First Name)</span>
                <span className="relative block">
                  <UserRound size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="field !pl-10"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="e.g. Santos, Maria"
                  />
                </span>
              </label>

              <div>
                <span className="label">Status</span>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
                  {[
                    ['Active', 'Can sign in and report', 'bg-emerald-500'],
                    ['Inactive', 'Disabled, no access', 'bg-slate-400'],
                  ].map(([v, hint, dot]) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setForm({ ...form, status: v })}
                      className={`relative rounded-xl px-3 py-2.5 text-left transition-colors ${form.status === v ? 'text-slate-900' : 'text-slate-500'}`}
                    >
                      {form.status === v && (
                        <motion.span layoutId="status-pick" className="absolute inset-0 rounded-xl bg-white shadow-sm" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                      )}
                      <span className="relative z-10 flex items-center gap-2 text-sm font-bold">
                        <span className={`h-2 w-2 rounded-full ${dot}`} /> {v}
                      </span>
                      <span className="relative z-10 mt-0.5 block text-xs text-slate-500">{hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="label">Branch / Hub</span>
                  <span className="relative block">
                    <MapPin size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      className="field !pl-10"
                      value={form.hubId}
                      onChange={(e) => setForm({ ...form, hubId: e.target.value, departmentId: '' })}
                      required
                    >
                      <option value="">Select hub</option>
                      {lookups.hubs.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
                <label className="block">
                  <span className="label">Department</span>
                  <span className="relative block">
                    <Building2 size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      className="field !pl-10"
                      value={form.departmentId}
                      onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                      required
                      disabled={!form.hubId}
                    >
                      <option value="">{form.hubId ? 'Select department' : 'Pick a hub first'}</option>
                      {lookups.departments
                        .filter((d) => String(d.hub_id) === String(form.hubId))
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  </span>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" className="btn btn-muted" onClick={close}>
                  Cancel
                </button>
                <button disabled={saving} className="btn btn-primary sm:min-w-40">
                  {saving ? (
                    <>
                      <Spinner /> Saving…
                    </>
                  ) : editing ? (
                    'Save changes'
                  ) : (
                    'Add employee'
                  )}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}