import { motion } from "framer-motion";

const variants = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  saffron: "bg-saffron text-[#2A2622] hover:brightness-95",
  outline: "border border-line bg-surface text-ink hover:bg-primary-soft",
  ghost: "text-ink hover:bg-primary-soft",
  danger: "bg-brick text-white hover:brightness-95",
};
const sizes = { sm: "h-8 px-3 text-xs gap-1.5", md: "h-10 px-4 text-sm gap-2", lg: "h-12 px-6 text-base gap-2" };

export default function Button({ variant = "primary", size = "md", loading = false, icon: Icon, className = "", children, disabled, ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      disabled={disabled || loading}
      className={`inline-flex cursor-pointer items-center justify-center rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : Icon && <Icon className="size-4" />}
      {children}
    </motion.button>
  );
}
