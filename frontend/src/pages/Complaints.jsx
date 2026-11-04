import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, messageFromError } from '../api/client';
import { Search, ChevronLeft, ChevronRight, Download, Inbox, ArrowUpRight, MapPin, Clock, ClipboardList, ShieldAlert, CalendarDays, Building2, Layers, Copy } from 'lucide-react';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import { PageHeader, container, item, severityStyle, initials, timeAgo } from '../components/ui';

function SeverityPill({ level }) {
  const s = severityStyle[level] || severityStyle.Low;
  return <span className={`pill ${s.pill}`}>{level}</span>;
}

export default function Complaints() {
  const [data, setData] = useState({ items: [], page: 1, total: 0, limit: 20 });
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  async function load() {
    try {
      const r = await api.get('/complaints', { params: { page, limit: 20, search, severity, from, to } });
      setData(r.data);
      setError('');
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [page, search, severity, from, to]);

  async function open(id) {
    try {
      const r = await api.get(`/complaints/${id}`);
      setDetail(r.data);
    } catch (e) {
      setError(messageFromError(e));
    }
  }

  async function exportCsv() {
    try {
      const r = await api.get('/complaints/reports', { params: { search, severity, from, to } });
      const rows = r.data.items;
      const esc = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
      const csv = [
        ['Concern ID', 'Person complained about', 'Severity', 'Subject', 'Message', 'Hub', 'Department', 'Created At'],
        ...rows.map((x) => [
          x.id,
          x.reportedEmployees.map((p) => p.full_name).join('; '),
          x.severity,
          x.subject,
          x.message,
          x.hub,
          x.department,
          x.createdAt,
        ]),
      ]
        .map((row) => row.map(esc).join(','))
        .join(String.fromCharCode(13, 10));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'ali-care-report.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('CSV exported', 'ali-care-report.csv was downloaded.');
    } catch (e) {
      setError(messageFromError(e));
      toast.error('Export failed', messageFromError(e));
    }
  }

  async function exportPdf() {
    try {
      const r = await api.get('/complaints/reports', {
        params: { search, severity, from, to, format: 'pdf' },
        responseType: 'blob',
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(r.data);
      a.download = 'ali-care-report.pdf';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('PDF exported', 'ali-care-report.pdf was downloaded.');
    } catch (e) {
      setError(messageFromError(e));
      toast.error('Export failed', messageFromError(e));
    }
  }

  const gridKey = `${page}-${data.total}-${data.items[0]?.id ?? 'none'}`;

  return (
    <div>
      <PageHeader title="Complaints" description="Cards show only the concern ID, reported person, and severity.">
        <button className="btn btn-muted" onClick={exportPdf}>
          <Download size={17} /> Export PDF
        </button>
        <button className="btn btn-primary" onClick={exportCsv}>
          <Download size={17} /> Export CSV
        </button>
      </PageHeader>

      {error && <div className="alert-error mb-4">{error}</div>}

      <div className="panel p-3 sm:p-4 flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            className="field !pl-10"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search concern ID or reported employee"
          />
        </div>
        <input
          aria-label="From date"
          type="date"
          className="field sm:w-40"
          value={from}
          onChange={(e) => {
            setPage(1);
            setFrom(e.target.value);
          }}
        />
        <input
          aria-label="To date"
          type="date"
          className="field sm:w-40"
          value={to}
          onChange={(e) => {
            setPage(1);
            setTo(e.target.value);
          }}
        />
        <select
          className="field sm:w-48"
          value={severity}
          onChange={(e) => {
            setPage(1);
            setSeverity(e.target.value);
          }}
        >
          <option value="">All severity levels</option>
          {['Low', 'Medium', 'High', 'Critical'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {['', 'Low', 'Medium', 'High', 'Critical'].map((l) => {
          const on = severity === l;
          return (
            <button
              key={l || 'all'}
              onClick={() => {
                setPage(1);
                setSeverity(l);
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                on ? 'bg-[color:var(--sidebar)] text-white shadow-lg' : 'bg-white text-slate-600 ring-1 ring-[color:var(--line)] hover:bg-slate-50'
              }`}
            >
              {l && <span className="h-2 w-2 rounded-full" style={{ background: severityStyle[l].hex }} />}
              {l || 'All'}
            </button>
          );
        })}
        <span className="ml-auto text-sm text-slate-500">{data.total} result{data.total === 1 ? '' : 's'}</span>
      </div>

      {!loaded ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-40" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="panel p-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700">
            <Inbox size={22} />
          </span>
          <p className="mt-4 font-semibold">No visible complaints match your filters</p>
          <p className="text-sm text-slate-500 mt-1">Clear the search or widen the date range to see more.</p>
        </div>
      ) : (
        <motion.div
          key={gridKey}
          variants={container}
          initial="hidden"
          animate="show"
          className="grid md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {data.items.map((x) => {
            const s = severityStyle[x.severity] || severityStyle.Low;
            return (
              <motion.button
                key={x.id}
                variants={item}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => open(x.id)}
                className="panel relative overflow-hidden text-left p-5 pl-6 transition-shadow hover:shadow-[0_22px_44px_-16px_rgba(10,22,64,0.35)]"
              >
                <span className={`absolute inset-y-0 left-0 w-1.5 ${s.bar}`} />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-500">Concern ID</span>
                  <SeverityPill level={x.severity} />
                </div>
                <div className="text-3xl font-extrabold tracking-tight mt-2 tabular-nums">#{x.id}</div>
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 text-xs font-bold text-teal-800">
                    {initials(x.reported_names?.split(';')[0] || '?')}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">Complained about</div>
                    <div className="font-semibold truncate">{x.reported_names || 'Reported employee'}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} /> {x.hub_name}
                    {x.department_name ? ` · ${x.department_name}` : ''}
                  </span>
                  <span className="inline-flex items-center gap-1" title={String(x.created_at)}>
                    <Clock size={13} /> {timeAgo(x.created_at)}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 font-semibold text-teal-700">
                    View <ArrowUpRight size={14} />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      <div className="flex items-center justify-between mt-6">
        <span className="text-sm text-slate-500">{data.total} complaints</span>
        <div className="flex gap-2">
          <button className="btn btn-muted" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={16} />
            Previous
          </button>
          <button
            className="btn btn-muted"
            disabled={page * data.limit >= data.total}
            onClick={() => setPage(page + 1)}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {detail && (
        <Modal
          title={`Concern #${detail.id}`}
          subtitle="Confidential complaint details"
          icon={ClipboardList}
          onClose={() => setDetail(null)}
        >
          {(close) => {
            const s = severityStyle[detail.severity] || severityStyle.Low;
            const text = String(detail.message || '').trim();
            const words = text ? text.split(/\s+/).length : 0;
            return (
              <div className="space-y-5">
                <div
                  className="relative flex items-center gap-4 overflow-hidden rounded-2xl p-5 text-white"
                  style={{ background: `linear-gradient(120deg, ${s.hex}, ${s.hex}b3)` }}
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20">
                    <ShieldAlert size={22} />
                  </span>
                  <div>
                    <div className="text-xs font-medium text-white/80">Level of concern</div>
                    <div className="text-2xl font-extrabold leading-tight">{detail.severity}</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-xs font-medium text-white/80">Concern ID</div>
                    <div className="text-2xl font-extrabold tabular-nums leading-tight">#{detail.id}</div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    [CalendarDays, 'Submitted', String(detail.createdAt).slice(0, 16), timeAgo(detail.createdAt)],
                    [Building2, 'Hub', detail.hub || '—', null],
                    [Layers, 'Department', detail.department || 'Not specified', null],
                  ].map(([Icon, label, value, sub]) => (
                    <div key={label} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Icon size={14} /> {label}
                      </div>
                      <div className="mt-1.5 font-bold leading-snug">{value}</div>
                      {sub && <div className="text-xs text-slate-400">{sub}</div>}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="label">
                    Person(s) complained about ({detail.reportedEmployees.length})
                  </div>
                  <div className="space-y-2">
                    {detail.reportedEmployees.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-2xl border border-[color:var(--line)] p-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 text-xs font-bold text-teal-800">
                          {initials(p.full_name)}
                        </span>
                        <span className="font-semibold">{p.full_name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="label">Subject</div>
                  <p className="whitespace-pre-wrap rounded-2xl bg-slate-50 px-4 py-3 font-semibold">
                    {detail.subject || 'No subject provided'}
                  </p>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="label !mb-0">Complaint message</div>
                    <span className="text-xs text-slate-400">
                      {words} word{words === 1 ? '' : 's'} · {text.length} characters
                    </span>
                  </div>
                  <div className="relative rounded-2xl bg-slate-50 p-4 pl-5">
                    <span className="absolute inset-y-3 left-0 w-1 rounded-full" style={{ background: s.hex }} />
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{detail.message}</p>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button className="btn btn-muted" onClick={close}>
                    Close
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      navigator.clipboard?.writeText(`#${detail.id}`);
                      toast.success('Concern ID copied', `#${detail.id} is on your clipboard.`);
                    }}
                  >
                    <Copy size={16} /> Copy concern ID
                  </button>
                </div>
              </div>
            );
          }}
        </Modal>
      )}
    </div>
  );
}