import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";

export default function Forbidden() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="grid min-h-[60dvh] place-items-center p-6 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-brick-soft text-brick"><ShieldAlert className="size-8" /></span>
        <h1 className="mt-4 text-2xl font-extrabold">No access</h1>
        <p className="mt-1 text-sm text-muted">Your role doesn&apos;t include this page.</p>
        <Link to="/" className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">Back to my home</Link>
      </div>
    </motion.div>
  );
}
