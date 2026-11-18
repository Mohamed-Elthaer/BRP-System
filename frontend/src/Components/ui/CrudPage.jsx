import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Button from "./Button.jsx";
import Modal, { ConfirmDialog } from "./Modal.jsx";
import DataTable from "./DataTable.jsx";
import ImagePicker from "./ImagePicker.jsx";
import { Input, SearchInput, Select, Switch, Textarea } from "./Fields.jsx";
import { PageHeader } from "./Display.jsx";

/*
 * صفحة CRUD عامة (جدول + بحث + مودال إضافة/تعديل + تأكيد حذف)
 *  sliceKey: اسم الـ slice في الـ store | thunks: { fetchAll, createOne, updateOne, removeOne }
 *  fields: [{ name, label, type: text|number|textarea|select|switch|image, options, required, full }]
 */
export default function CrudPage({
  title, subtitle, entity, sliceKey, thunks, columns, fields, canManage = true, toForm, toPayload,
  searchKeys = ["name"], removeLabel = "Delete", removeHint, emptyIcon, headerExtra,
}) {
  const dispatch = useDispatch();
  const { items, loading, saving } = useSelector((s) => s[sliceKey]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | item
  const [form, setForm] = useState({});
  const [toDelete, setToDelete] = useState(null);

  const reload = useCallback(() => dispatch(thunks.fetchAll()), [dispatch, thunks]);
  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => searchKeys.some((k) => String(i[k] ?? "").toLowerCase().includes(q)));
  }, [items, search, searchKeys]);

  const defaults = () => Object.fromEntries(fields.map((f) => [f.name, f.default ?? (f.type === "switch" ? true : "")]));
  const openNew = () => { setForm(defaults()); setEditing("new"); };
  const openEdit = (item) => {
    setForm(toForm ? { ...defaults(), ...toForm(item) } : { ...defaults(), ...item });
    setEditing(item);
  };
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const submit = async () => {
    const missing = fields.find((f) => f.required && (form[f.name] === "" || form[f.name] == null));
    if (missing) return toast.error(`${missing.label} is required`);
    const payload = toPayload ? toPayload(form) : form;
    try {
      if (editing === "new") await dispatch(thunks.createOne(payload)).unwrap();
      else await dispatch(thunks.updateOne({ id: editing._id, data: payload })).unwrap();
      toast.success(editing === "new" ? `${entity} created` : `${entity} updated`);
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err);
    }
  };

  const confirmRemove = async () => {
    try {
      await dispatch(thunks.removeOne(toDelete._id)).unwrap();
      toast.success(`${entity} removed`);
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(err);
      setToDelete(null);
    }
  };

  const ctx = { reload, dispatch, canManage };
  const cols = [
    ...columns.map((c) => ({ ...c, render: c.render ? (row) => c.render(row, ctx) : undefined })),
    ...(canManage
      ? [{
          key: "_actions", label: "", align: "right",
          render: (row) => (
            <div className="flex justify-end gap-1">
              <button onClick={() => openEdit(row)} aria-label="Edit" className="rounded-lg p-2 text-muted hover:bg-primary-soft hover:text-brand"><Pencil className="size-4" /></button>
              <button onClick={() => setToDelete(row)} aria-label={removeLabel} className="rounded-lg p-2 text-muted hover:bg-brick-soft hover:text-brick"><Trash2 className="size-4" /></button>
            </div>
          ),
        }]
      : []),
  ];

  const renderField = (f) => {
    const common = { label: f.label, value: form[f.name] ?? "", onChange: (e) => set(f.name, e.target.value), wrapperClass: f.full ? "sm:col-span-2" : "" };
    if (f.type === "textarea") return <Textarea key={f.name} {...common} />;
    if (f.type === "select") return <Select key={f.name} {...common} options={f.options} placeholder={f.placeholder ?? "Select…"} />;
    if (f.type === "switch") return <div key={f.name} className="sm:col-span-2"><Switch checked={!!form[f.name]} onChange={(v) => set(f.name, v)} label={f.label} /></div>;
    if (f.type === "image") {
      return (
        <div key={f.name} className="sm:col-span-2">
          <ImagePicker label={f.label} file={form[f.name]} currentUrl={editing !== "new" ? f.currentUrl?.(editing) : undefined} onChange={(file) => set(f.name, file)} />
        </div>
      );
    }
    return <Input key={f.name} {...common} type={f.type || "text"} step={f.type === "number" ? "any" : undefined} min={f.min} />;
  };

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={<>{headerExtra}{canManage && <Button icon={Plus} onClick={openNew}>Add {entity}</Button>}</>}
      />
      <div className="mb-4 "><SearchInput value={search} onChange={setSearch} placeholder={`Search ${title.toLowerCase()}…`} className="max-w-sm" /></div>
      <DataTable columns={cols} rows={filtered} loading={loading} empty={`No ${title.toLowerCase()} yet`} emptyIcon={emptyIcon} />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? `Add ${entity}` : `Edit ${entity}`}
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button loading={saving} onClick={submit}>Save</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">{fields.map(renderField)}</div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmRemove}
        danger
        loading={saving}
        title={`${removeLabel} ${entity}?`}
        message={removeHint || `This ${entity.toLowerCase()} will be removed.`}
        confirmLabel={removeLabel}
      />
    </>
  );
}
