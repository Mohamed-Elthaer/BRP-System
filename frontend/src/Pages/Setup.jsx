import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { Crown } from "lucide-react";
import { setupOwner } from "../Redux/Slices/authSlice.js";
import Button from "../Components/ui/Button.jsx";
import { Input } from "../Components/ui/Fields.jsx";

// أول حساب (المالك) بس. الباك بيرفض لو فيه مستخدمين أصلاً
export default function Setup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading = useSelector((s) => s.auth.loading);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(setupOwner(form)).unwrap();
      toast.success("Owner account created");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-xl sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-white shadow-sm"><Crown className="size-6" /></span>
        <h1 className="mt-4 text-2xl font-extrabold">Set up your restaurant</h1>
        <p className="mt-1 text-sm text-muted">Create the owner account. This works only once. Other staff are added from Employees.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input label="First name" required value={form.firstName} onChange={set("firstName")} />
          <Input label="Last name" required value={form.lastName} onChange={set("lastName")} />
          <Input wrapperClass="sm:col-span-2" label="Email" type="email" required value={form.email} onChange={set("email")} />
          <Input wrapperClass="sm:col-span-2" label="Phone (optional)" value={form.phone} onChange={set("phone")} />
          <Input wrapperClass="sm:col-span-2" label="Password" type="password" minLength={6} required hint="At least 6 characters" value={form.password} onChange={set("password")} />
        </div>
        <Button type="submit" size="lg" className="mt-6 w-full" loading={loading}>Create owner account</Button>
        <p className="mt-4 text-center text-sm text-muted">Already set up? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link></p>
      </motion.form>
    </div>
  );
}
