import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, messageFromError } from '../api/client';
import { Search, ChevronLeft, ChevronRight, Download, Inbox } from 'lucide-react';
import Modal from '../components/Modal';
import { PageHeader, container, item, severityStyle } from '../components/ui';

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
    } catch (e) {
      setError(messageFromError(e));
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
    } catch (e) {
      setError(messageFromError(e));
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
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => open(x.id)}
                className="panel relative overflow-hidden text-left p-5 pl-6 transition-shadow hover:shadow-[0_18px_40px_-16px_rgba(6,27,26,0.3)]"
              >
                <span className={`absolute inset-y-0 left-0 w-1.5 ${s.bar}`} />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Concern ID</span>
                  <SeverityPill level={x.severity} />
                </div>
                <div className="text-3xl font-extrabold tracking-tight mt-2 tabular-nums">#{x.id}</div>
                <div className="font-semibold mt-4 truncate">{x.reported_names || 'Reported employee'}</div>
                <div className="text-xs text-slate-500 mt-3">
                  {x.hub_name}
                  {x.department_name ? ` · ${x.department_name}` : ''}
                </div>
                <div className="text-xs text-slate-400 mt-1">{String(x.created_at).slice(0, 16)}</div>
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
        <Modal title={`Concern #${detail.id}`} onClose={() => setDetail(null)}>
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="label">Level of Concern</div>
                <SeverityPill level={detail.severity} />
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="label">Date</div>
                <b>{String(detail.createdAt)}</b>
              </div>
            </div>
            <div>
              <div className="label">Person(s) complained about</div>
              <div className="flex flex-wrap gap-2">
                {detail.reportedEmployees.map((p, i) => (
                  <span key={i} className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">
                    {p.full_name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="label">Hub / Department</div>
              <div>
                {detail.hub}
                {detail.department ? ` / ${detail.department}` : ''}
              </div>
            </div>
            <div>
              <div className="label">Subject</div>
              <p className="whitespace-pre-wrap">{detail.subject || 'No subject provided'}</p>
            </div>
            <div>
              <div className="label">Complaint Message</div>
              <p className="whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-4 leading-relaxed">
                {detail.message}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}