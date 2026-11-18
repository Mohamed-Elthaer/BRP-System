import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";

const tones = {
  neutral: "bg-line/60 text-muted",
  success: "bg-primary-soft text-brand",
  warn: "bg-saffron-soft text-saffron",
  danger: "bg-brick-soft text-brick",
};

export function Badge({ tone = "neutral", className = "", children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}>{children}</span>;
}

export function Pill({ className = "", children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}

export function Card({ className = "", children, ...props }) {
  return <div className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`} {...props}>{children}</div>;
}

export function Spinner({ className = "size-6" }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-primary border-t-transparent ${className}`} />;
}

export function Skeleton({ className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-line/70 ${className}`}>
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      {Icon && <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-brand"><Icon className="size-7" /></span>}
      <p className="font-bold">{title}</p>
      {hint && <p className="max-w-xs text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}

export function Delta({ value }) {
  if (value === null || value === undefined) return <span className="text-xs text-muted">vs previous: —</span>;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? "text-brand" : "text-brick"}`}>
      <Icon className="size-3.5" />
      {Math.abs(value)}% <span className="font-normal text-muted">vs previous</span>
    </span>
  );
}

export function StatCard({ icon: Icon, label, value, delta, accent = "primary", index = 0 }) {
  const accents = { primary: "bg-primary-soft text-brand", saffron: "bg-saffron-soft text-saffron", brick: "bg-brick-soft text-brick" };
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
      <Card className="h-full">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-muted">{label}</p>
          {Icon && <span className={`grid size-9 place-items-center rounded-xl ${accents[accent]}`}><Icon className="size-4.5" /></span>}
        </div>
        <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
        {delta !== undefined && <div className="mt-1"><Delta value={delta} /></div>}
      </Card>
    </motion.div>
  );
}
