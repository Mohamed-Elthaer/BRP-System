import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { KeyRound, Pencil, Plus, Power, Users } from "lucide-react";
import { changeEmployeeStatus, createEmployee, fetchUsers, resetEmployeePassword, updateEmployee } from "../Redux/Slices/usersSlice.js";
import { ROLE_META, ROLE_ORDER } from "../Utils/constants.js";
import { dt, fullName, initials, toInputDate } from "../Utils/format.js";
import useDebounce from "../Hooks/useDebounce.js";
import Button from "../Components/ui/Button.jsx";
import Modal, { ConfirmDialog } from "../Components/ui/Modal.jsx";
import DataTable, { Pagination } from "../Components/ui/DataTable.jsx";
import ImagePicker from "../Components/ui/ImagePicker.jsx";
import { Badge, PageHeader } from "../Components/ui/Display.jsx";
import { Input, SearchInput, Select } from "../Components/ui/Fields.jsx";

const empty = { firstName: "", lastName: "", email: "", password: "", phone: "", role: "cashier", jobTitle: "", salary: "", hireDate: "", avatar: null };
const roleOptions = (keys) => keys.map((k) => ({ value: k, label: ROLE_META[k].label }));

export default function Employees() {
  const dispatch = useDispatch();
  const me = useSelector((s) => s.auth.user);
  const { items, meta, loading } = useSelector((s) => s.users);
  const [f, setF] = useState({ role: "", isActive: "", search: "" });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [pwTarget, setPwTarget] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [statusTarget, setStatusTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const search = useDebounce(f.search);

  const isOwner = me.role === "owner";
  // نفس قاعدة الباك: المالك يدير الكل، المدير يدير اللي أقل منه بس
  const manageable = (role) => isOwner || !["owner", "manager"].includes(role);
  const allowedRoles = isOwner ? ROLE_ORDER : ROLE_ORDER.filter(manageable);

  const reload = () => dispatch(fetchUsers({ page, limit: 15, ...f, search }));
  useEffect(() => { reload(); }, [page, f.role, f.isActive, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => { setForm({ ...empty, role: allowedRoles.includes("cashier") ? "cashier" : allowedRoles[0] }); setEditing("new"); };
  const openEdit = (u) => { setForm({ ...empty, ...u, phone: u.phone || "", jobTitle: u.jobTitle || "", hireDate: toInputDate(u.hireDate), salary:u.salary ?? "", avatar: null }); setEditing(u); };
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const run = async (fn, ok, after) => {
    setSaving(true);
    try { await fn(); toast.success(ok); after?.(); reload(); } catch (err) { toast.error(err); }
    setSaving(false);
  };

  const save = () => {
    if (editing === "new" && form.password.length < 6) return toast.error("Password must be at least 6 characters");
    const data = { ...form, password: editing === "new" ? form.password : undefined, salary: isOwner && form.salary !== "" ? Number(form.salary) : undefined, avatar: form.avatar instanceof File ? form.avatar : undefined };
    return run(
      () => (editing === "new" ? dispatch(createEmployee(data)).unwrap() : dispatch(updateEmployee({ id: editing._id, data })).unwrap()),
      editing === "new" ? "Employee created" : "Employee updated", () => setEditing(null),
    );
  };

  const columns = [
    { key: "name", label: "Employee", render: (u) => (
      <div className="flex items-center gap-3">
        {u.avatar?.url ? <img src={u.avatar.url} alt="" className="size-9 rounded-full object-cover" /> : <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-xs font-bold text-brand">{initials(u)}</span>}
        <div><p className="font-semibold">{fullName(u)}</p><p className="text-xs text-muted">{u.email}</p></div>
      </div>
    ) },
    { key: "role", label: "Role", render: (u) => <Badge tone={u.role === "owner" ? "warn" : "success"}>{ROLE_META[u.role]?.label}</Badge> },
    { key: "jobTitle", label: "Job title", render: (u) => u.jobTitle || "—" },
    { key: "isActive", label: "Status", render: (u) => <Badge tone={u.isActive ? "success" : "danger"}>{u.isActive ? "Active" : "Deactivated"}</Badge> },
    { key: "lastLogin", label: "Last login", render: (u) => <span className="text-muted">{u.lastLogin ? dt(u.lastLogin) : "Never"}</span> },
    { key: "_a", label: "", align: "right", render: (u) => {
      const self = u._id === me._id;
      if (!manageable(u.role) && !self) return null;
      return (
        <div className="flex justify-end gap-1">
          <button onClick={() => openEdit(u)} aria-label="Edit" className="rounded-lg p-2 text-muted hover:bg-primary-soft hover:text-brand"><Pencil className="size-4" /></button>
          {!self && <>
            <button onClick={() => { setPwTarget(u); setNewPw(""); }} aria-label="Reset password" className="rounded-lg p-2 text-muted hover:bg-primary-soft hover:text-brand"><KeyRound className="size-4" /></button>
            <button onClick={() => setStatusTarget(u)} aria-label={u.isActive ? "Deactivate" : "Activate"} className={`rounded-lg p-2 text-muted ${u.isActive ? "hover:bg-brick-soft hover:text-brick" : "hover:bg-primary-soft hover:text-brand"}`}><Power className="size-4" /></button>
          </>}
        </div>
      );
    } },
  ];

  return (
    <>
      <PageHeader title="Employees" subtitle="Accounts are deactivated, never deleted, so order history stays intact" actions={<Button icon={Plus} onClick={openNew}>Add employee</Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px_180px]">
        <SearchInput value={f.search} onChange={(v) => { setF({ ...f, search: v }); setPage(1); }} placeholder="Name, email or phone" />
        <Select value={f.role} onChange={(e) => { setF({ ...f, role: e.target.value }); setPage(1); }} placeholder="All roles" options={roleOptions(ROLE_ORDER)} />
        <Select value={f.isActive} onChange={(e) => { setF({ ...f, isActive: e.target.value }); setPage(1); }} placeholder="Any status" options={[{ value: "true", label: "Active" }, { value: "false", label: "Deactivated" }]} />
      </div>
      <DataTable columns={columns} rows={items} loading={loading} empty="No employees found" emptyIcon={Users} />
      <Pagination meta={meta} onChange={setPage} />

      <Modal open={!!editing} onClose={() => setEditing(null)} size="lg" title={editing === "new" ? "Add employee" : "Edit employee"} footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button loading={saving} onClick={save}>Save</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><ImagePicker label="Photo" file={form.avatar} currentUrl={editing && editing !== "new" ? editing.avatar?.url : undefined} onChange={(file) => setForm({ ...form, avatar: file })} /></div>
          <Input label="First name" required value={form.firstName} onChange={set("firstName")} />
          <Input label="Last name" required value={form.lastName} onChange={set("lastName")} />
          <Input label="Email" type="email" required value={form.email} onChange={set("email")} />
          <Input label="Phone" value={form.phone} onChange={set("phone")} />
          {editing === "new" && <Input label="Password" type="password" minLength={6} value={form.password} onChange={set("password")} hint="At least 6 characters" />}
          <Select label="Role" value={form.role} onChange={set("role")} options={roleOptions(editing === "new" || (isOwner && editing?._id !== me._id) ? allowedRoles : [form.role])} />
          <Input label="Job title" value={form.jobTitle} onChange={set("jobTitle")} />
          <Input label="Hire date" type="date" value={form.hireDate} onChange={set("hireDate")} />
          {isOwner && <Input label="Salary" type="number" min={0} step="any" value={form.salary} onChange={set("salary")} hint={editing !== "new" ? "Leave blank to keep the current salary" : "Only owners can see salaries"} />}
        </div>
      </Modal>

      <Modal open={!!pwTarget} onClose={() => setPwTarget(null)} size="sm" title={`Reset password · ${fullName(pwTarget)}`} footer={<><Button variant="ghost" onClick={() => setPwTarget(null)}>Cancel</Button><Button loading={saving} onClick={() => newPw.length < 6 ? toast.error("At least 6 characters") : run(() => dispatch(resetEmployeePassword({ id: pwTarget._id, newPassword: newPw })).unwrap(), "Password reset", () => setPwTarget(null))}>Reset</Button></>}>
        <Input label="New password" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} hint="Share it with the employee privately." />
      </Modal>

      <ConfirmDialog open={!!statusTarget} onClose={() => setStatusTarget(null)} loading={saving} danger={statusTarget?.isActive} confirmLabel={statusTarget?.isActive ? "Deactivate" : "Activate"}
        title={`${statusTarget?.isActive ? "Deactivate" : "Activate"} ${fullName(statusTarget)}?`}
        message={statusTarget?.isActive ? "They won't be able to sign in. Their history is kept." : "They will be able to sign in again."}
        onConfirm={() => run(() => dispatch(changeEmployeeStatus({ id: statusTarget._id, isActive: !statusTarget.isActive })).unwrap(), "Status updated", () => setStatusTarget(null))} />
    </>
  );
}
