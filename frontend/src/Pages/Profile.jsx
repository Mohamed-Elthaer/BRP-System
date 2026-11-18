import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { changePassword, updateProfile } from "../Redux/Slices/authSlice.js";
import { ROLE_META } from "../Utils/constants.js";
import Button from "../Components/ui/Button.jsx";
import { Input } from "../Components/ui/Fields.jsx";
import ImagePicker from "../Components/ui/ImagePicker.jsx";
import { Badge, Card, PageHeader } from "../Components/ui/Display.jsx";

export default function Profile() {
  const dispatch = useDispatch();
  const { user, permissions } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName, phone: user.phone || "", avatar: null });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dispatch(updateProfile(form)).unwrap();
      setForm((f) => ({ ...f, avatar: null }));
      toast.success("Profile updated");
    } catch (err) { toast.error(err); }
    setSaving(false);
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return toast.error("Passwords don't match");
    setChanging(true);
    try {
      await dispatch(changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword })).unwrap();
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password changed");
    } catch (err) { toast.error(err); }
    setChanging(false);
  };

  return (
    <>
      <PageHeader title="My profile" subtitle={`${ROLE_META[user.role]?.label} · ${user.email}`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <form onSubmit={save} className="space-y-4">
            <h2 className="font-bold">Personal info</h2>
            <ImagePicker label="Photo" file={form.avatar} currentUrl={user.avatar?.url} onChange={(f) => setForm({ ...form, avatar: f })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="First name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <Input label="Last name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              <Input wrapperClass="sm:col-span-2" label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <Button type="submit" loading={saving}>Save changes</Button>
          </form>
        </Card>

        <div className="space-y-5">
          <Card>
            <form onSubmit={savePassword} className="space-y-4">
              <h2 className="font-bold">Change password</h2>
              <Input label="Current password" type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
              <Input label="New password" type="password" minLength={6} required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
              <Input label="Confirm new password" type="password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              <Button type="submit" variant="outline" loading={changing}>Update password</Button>
            </form>
          </Card>
          <Card>
            <h2 className="mb-3 font-bold">What your role can do</h2>
            <div className="flex flex-wrap gap-2">{permissions.map((p) => <Badge key={p} tone="success">{p}</Badge>)}</div>
          </Card>
        </div>
      </div>
    </>
  );
}
