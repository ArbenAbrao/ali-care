import React from 'react';

export default function Field({ label, error, hint, icon: Icon, ...props }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <span className="relative block">
        {Icon && <Icon size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
        <input className={`field ${Icon ? '!pl-10' : ''}`} aria-invalid={!!error} {...props} />
      </span>
      {hint && !error && <span className="block text-xs text-slate-500 mt-1.5">{hint}</span>}
      {error && <span className="error">{error}</span>}
    </label>
  );
}