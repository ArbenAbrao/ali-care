import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, messageFromError } from '../api/client';
import { Plus, Upload, Download, Edit3, Search, FileSpreadsheet } from 'lucide-react';
import Modal from '../components/Modal';
import { PageHeader, ease, initials } from '../components/ui';

const blank = { employeeId: '', name: '', status: 'Active', hubId: '', departmentId: '' };

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
    }
  }

  async function importFile() {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await api.post('/employee/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSummary(r.data);
      load();
    } catch (e) {
      setError(messageFromError(e));
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

      <div className="panel p-5 mb-5">
        <h2 className="font-bold">Bulk import CSV / XLSX</h2>
        <p className="text-sm text-slate-500 mt-1">
          Required columns: Name, Status, Branch, Department, Employee ID. Name format: Last Name, First Name.
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 px-4 py-3 transition-colors hover:bg-teal-50">
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
          <button className="btn btn-primary" onClick={importFile} disabled={!file}>
            <Upload size={16} /> Import file
          </button>
          <a
            className="btn btn-muted"
            href="data:text/csv;charset=utf-8,Name%2CStatus%2CBranch%2CDepartment%2CEmployee%20ID%0A%22Santos%2C%20Maria%22%2CActive%2CMarilao%20Hub%2COperations%2C100001"
            download="ali-care-import-template.csv"
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
            onChange={(e) => setSearch(e.target.value)}
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
              {items.map((x, i) => (
                <motion.tr
                  key={x.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease, delay: Math.min(i, 12) * 0.025 }}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-xs font-bold text-teal-800">
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
      </div>

      {open && (
        <Modal title={editing ? 'Edit employee' : 'Add employee'} onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-4">
            <label className="block">
              <span className="label">Employee ID</span>
              <input
                className="field"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                required
                placeholder={editing ? 'Re-enter Employee ID to update' : 'Employee ID'}
              />
              <span className="text-xs text-slate-500 mt-1.5 block">
                Employee ID is stored encrypted. Re-enter it when editing.
              </span>
            </label>
            <label className="block">
              <span className="label">Name (Last Name, First Name)</span>
              <input
                className="field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="label">Status</span>
              <select
                className="field"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="label">Branch / Hub</span>
                <select
                  className="field"
                  value={form.hubId}
                  onChange={(e) => {
                    const h = e.target.value;
                    setForm({ ...form, hubId: h, departmentId: '' });
                  }}
                  required
                >
                  <option value="">Select hub</option>
                  {lookups.hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Department</span>
                <select
                  className="field"
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  required
                >
                  <option value="">Select department</option>
                  {lookups.departments
                    .filter((d) => String(d.hub_id) === String(form.hubId))
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <button className="btn btn-primary w-full">Save employee</button>
          </form>
        </Modal>
      )}
    </div>
  );
}