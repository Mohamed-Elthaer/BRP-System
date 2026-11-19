import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { ArrowRight, Check, ChefHat, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { loginUser, logoutUser } from "../Redux/Slices/authSlice.js";
import { ROLE_META, ROLE_ORDER } from "../Utils/constants.js";
import Button from "../Components/ui/Button.jsx";
import { Input } from "../Components/ui/Fields.jsx";
import ThemeToggle from "../Components/layout/ThemeToggle.jsx";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", damping: 22, stiffness: 240 } } };

const FEATURES = ["Live orders from POS to kitchen", "Stock that updates itself", "Costs and profit per dish", "Works even when the internet drops"];

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, initializing } = useSelector((s) => s.auth);
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mismatch, setMismatch] = useState("");

  // بنمنع التحويل التلقائي أثناء الدخول لحد ما نتأكد إن الدور المختار مطابق لحساب الباك
  if (user && !busy && !initializing) return <Navigate to={ROLE_META[user.role]?.home || "/"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!role) return toast.error("Choose your role first");
    setMismatch("");
    setBusy(true);
    try {
      const res = await dispatch(loginUser({ email, password })).unwrap();
      if (res.user.role !== role) {
        await dispatch(logoutUser());
        setMismatch(`This account is not a ${ROLE_META[role].label} account. Pick the role that matches it.`);
        setBusy(false);
        return;
      }
      navigate(ROLE_META[role].home, { replace: true });
    } catch (err) {
      toast.error(err);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* لوحة الهوية */}
      <section className="relative hidden overflow-hidden border-r border-line bg-surface p-12 text-ink lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 -top-24 size-96 animate-float rounded-full bg-primary-soft blur-3xl" />
        <div className="absolute -bottom-32 right-0 size-[28rem] animate-float rounded-full bg-primary-soft/80 blur-3xl [animation-delay:-4s]" />
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative flex items-center gap-3">
          <img src="./logo.png" alt="Mat3amy" className="h-14 w-auto object-contain drop-shadow" />
          <span className="text-xl font-extrabold tracking-tight text-ink">Mat3amy</span>
        </motion.div>
        <motion.div variants={container} initial="hidden" animate="show" className="relative max-w-md">
          <motion.h1 variants={item} className="text-4xl font-extrabold leading-tight text-ink xl:text-5xl">
            Your whole restaurant, <span className="text-primary">one calm screen.</span>
          </motion.h1>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <motion.li key={f} variants={item} className="flex items-center gap-3 font-medium text-ink/80">
                <span className="grid size-6 place-items-center rounded-full bg-primary-soft text-primary"><Check className="size-3.5" /></span>{f}
              </motion.li>
            ))}
          </ul>
        </motion.div>
        <p className="relative text-sm text-muted">Complete restaurant management operating system.</p>
      </section>

      {/* الفورم */}
      <section className="relative flex items-center justify-center px-4 py-10 sm:px-8">
        <ThemeToggle className="absolute right-4 top-4" />
        <motion.div variants={container} initial="hidden" animate="show" className="w-full max-w-lg">
          <motion.div variants={item} className="mb-6 flex items-center gap-3 lg:hidden">
            <img src="./logo.png" alt="Mat3amy" className="h-12 w-auto object-contain" />
            <span className="text-lg font-extrabold">Mat3amy</span>
          </motion.div>
          <motion.h2 variants={item} className="text-2xl font-extrabold sm:text-3xl">Welcome back</motion.h2>
          <motion.p variants={item} className="mt-1 text-sm text-muted">Choose how you work today, then sign in.</motion.p>

          <motion.div variants={item} className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ROLE_ORDER.map((key) => {
              const { label, desc, icon: Icon } = ROLE_META[key];
              const active = role === key;
              return (
                <motion.button
                  key={key}
                  type="button"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setRole(key); setMismatch(""); }}
                  aria-pressed={active}
                  className={`relative rounded-2xl border p-3 text-left transition-all ${
                    active
                      ? "border-primary bg-primary-soft shadow-xs"
                      : "border-line bg-surface hover:border-primary/50"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="role-check"
                      className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-primary text-white shadow-xs"
                    >
                      <Check className="size-3" />
                    </motion.span>
                  )}
                  <Icon className={`size-6 ${active ? "text-primary" : "text-brand"}`} />
                  <p className="mt-2 text-sm font-bold">{label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted">{desc}</p>
                </motion.button>
              );
            })}
          </motion.div>

          <AnimatePresence>
            {role && (
              <motion.form
                key="form"
                onSubmit={submit}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 pt-6">
                  <p className="text-sm font-semibold text-brand">Signing in as {ROLE_META[role].label}</p>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-[34px] size-4 text-muted" />
                    <Input label="Email" type="email" required autoComplete="email" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@restaurant.com" />
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-[34px] size-4 text-muted" />
                    <Input label="Password" type={show ? "text" : "password"} required autoComplete="current-password" className="px-9" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                    <button type="button" onClick={() => setShow((v) => !v)} aria-label="Toggle password" className="absolute right-3 top-[32px] text-muted hover:text-ink">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                  </div>
                  {mismatch && <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl bg-brick-soft px-3 py-2 text-sm text-brick">{mismatch}</motion.p>}
                  <Button type="submit" size="lg" className="w-full" loading={busy || loading}>Sign in <ArrowRight className="size-4" /></Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <motion.p variants={item} className="mt-6 text-center text-sm text-muted">
            Select your profile to sign in
          </motion.p>
        </motion.div>
      </section>
    </div>
  );
}
