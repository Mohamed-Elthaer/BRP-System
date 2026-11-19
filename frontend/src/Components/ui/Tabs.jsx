import { motion } from "framer-motion";

// التبويب النشط بخط زعفراني متحرك
export default function Tabs({ items, value, onChange, id = "tabs" }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`relative whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-colors ${value === t.key ? "text-ink" : "text-muted hover:text-ink"}`}
        >
          {t.label}
          {value === t.key && <motion.span layoutId={`${id}-underline`} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
        </button>
      ))}
    </div>
  );
}
