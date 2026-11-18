import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-7xl font-extrabold text-saffron">404</p>
        <h1 className="mt-2 text-xl font-bold">Page not found</h1>
        <p className="mt-1 text-sm text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/" className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">Go home</Link>
      </motion.div>
    </div>
  );
}
