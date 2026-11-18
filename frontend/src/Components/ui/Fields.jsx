import { Search } from "lucide-react";

const base =
  "w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export function Field({ label, error, hint, className = "", children }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-brick">{error}</span>}
    </label>
  );
}

export function Input({ label, error, hint, className = "", wrapperClass = "", ...props }) {
  return (
    <Field label={label} error={error} hint={hint} className={wrapperClass}>
      <input className={`${base} h-10 ${className}`} {...props} />
    </Field>
  );
}

export function Textarea({ label, error, hint, className = "", wrapperClass = "", ...props }) {
  return (
    <Field label={label} error={error} hint={hint} className={wrapperClass}>
      <textarea rows={3} className={`${base} py-2 ${className}`} {...props} />
    </Field>
  );
}

// options: ["a","b"] أو [{ value, label }]
export function Select({ label, error, options = [], placeholder, className = "", wrapperClass = "", ...props }) {
  return (
    <Field label={label} error={error} className={wrapperClass}>
      <select className={`${base} h-10 ${className}`} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === "object" ? o : { value: o, label: o };
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
    </Field>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-sm font-medium"
    >
      <span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-primary" : "bg-line"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${base} h-10 pl-9`} />
    </div>
  );
}
