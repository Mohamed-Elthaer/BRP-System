import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Check, Plus, X } from "lucide-react";
import { fetchRoles, saveSettings, uploadLogo } from "../Redux/Slices/settingsSlice.js";
import { FIELD_LABELS, ROLE_META, ROLE_ORDER } from "../Utils/constants.js";
import Button from "../Components/ui/Button.jsx";
import Tabs from "../Components/ui/Tabs.jsx";
import ImagePicker from "../Components/ui/ImagePicker.jsx";
import { Card, PageHeader, Spinner } from "../Components/ui/Display.jsx";
import { Input, Select, Switch, Textarea } from "../Components/ui/Fields.jsx";

const TABS = [
  { key: "general", label: "Restaurant" }, { key: "tax", label: "Tax & service" }, { key: "discount", label: "Discounts" },
  { key: "types", label: "Order types" }, { key: "payments", label: "Payment methods" }, { key: "expenses", label: "Expense categories" },
  { key: "invoice", label: "Invoice" }, { key: "roles", label: "Roles" },
];
const TIMEZONES = ["Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Europe/London", "UTC"];

const setIn = (obj, path, value) => {
  const copy = structuredClone(obj);
  const keys = path.split(".");
  let cur = copy;
  keys.slice(0, -1).forEach((k) => { cur = cur[k]; });
  cur[keys.at(-1)] = value;
  return copy;
};

export default function Settings() {
  const dispatch = useDispatch();
  const { data, saving, roles } = useSelector((s) => s.settings);
  const [tab, setTab] = useState("general");
  const [d, setD] = useState(null);
  const [newCat, setNewCat] = useState("");

  useEffect(() => { if (data) setD(structuredClone(data)); }, [data]);
  useEffect(() => { if (tab === "roles" && !roles) dispatch(fetchRoles()); }, [tab, roles, dispatch]);

  if (!d) return <div className="grid place-items-center py-20"><Spinner className="size-8" /></div>;

  const upd = (path) => (e) => setD((p) => setIn(p, path, e?.target ? (e.target.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value) : e));
  const save = async (keys) => {
    const payload = Object.fromEntries(keys.map((k) => [k, k === "restaurant" ? { name: d.restaurant.name, phone: d.restaurant.phone, address: d.restaurant.address, taxNumber: d.restaurant.taxNumber } : d[k]]));
    try { await dispatch(saveSettings(payload)).unwrap(); toast.success("Settings saved"); } catch (err) { toast.error(err); }
  };
  const SaveBtn = ({ keys }) => <Button className="mt-5" loading={saving} onClick={() => save(keys)}>Save changes</Button>;
  const toggleIn = (path, list, value) => upd(path)(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  return (
    <>
      <PageHeader title="Settings" subtitle="Changes apply to new orders only. Past invoices never change" />
      <Tabs id="settings" items={TABS} value={tab} onChange={setTab} />
      <Card className="max-w-3xl">
        {tab === "general" && (
          <>
            <ImagePicker label="Logo" currentUrl={d.restaurant.logo?.url} onChange={async (file) => { if (!file) return; try { await dispatch(uploadLogo(file)).unwrap(); toast.success("Logo updated"); } catch (err) { toast.error(err); } }} />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input label="Restaurant name" value={d.restaurant.name || ""} onChange={upd("restaurant.name")} />
              <Input label="Phone" value={d.restaurant.phone || ""} onChange={upd("restaurant.phone")} />
              <Input wrapperClass="sm:col-span-2" label="Address" value={d.restaurant.address || ""} onChange={upd("restaurant.address")} />
              <Input label="Tax number" value={d.restaurant.taxNumber || ""} onChange={upd("restaurant.taxNumber")} />
              <Input label="Currency (3 letters)" maxLength={3} value={d.currency} onChange={(e) => upd("currency")(e.target.value.toUpperCase())} />
              <div className="sm:col-span-2">
                <Input label="Time zone" list="tz" value={d.timezone} onChange={upd("timezone")} hint="Used for daily order numbers and reports" />
                <datalist id="tz">{TIMEZONES.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
            </div>
            <SaveBtn keys={["restaurant", "currency", "timezone"]} />
          </>
        )}

        {tab === "tax" && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-3"><Switch checked={d.tax.enabled} onChange={upd("tax.enabled")} label="Charge tax" /><Input label="Tax rate (%)" type="number" min={0} max={100} step="any" value={d.tax.rate} onChange={upd("tax.rate")} /></div>
              <div className="space-y-3"><Switch checked={d.serviceCharge.enabled} onChange={upd("serviceCharge.enabled")} label="Service charge" /><Input label="Service rate (%)" type="number" min={0} max={100} step="any" value={d.serviceCharge.rate} onChange={upd("serviceCharge.rate")} />
                <div><p className="mb-1.5 text-xs font-semibold text-muted">Applies to</p><div className="flex flex-wrap gap-2">{d.orderTypes.map((t) => <button key={t.key} onClick={() => toggleIn("serviceCharge.appliesTo", d.serviceCharge.appliesTo, t.key)} className={`rounded-full px-3 py-1 text-xs font-semibold ${d.serviceCharge.appliesTo.includes(t.key) ? "bg-saffron text-[#2A2622]" : "border border-line"}`}>{t.label || t.key}</button>)}</div></div>
              </div>
            </div>
            <SaveBtn keys={["tax", "serviceCharge"]} />
          </>
        )}

        {tab === "discount" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Switch checked={d.defaultDiscount.enabled} onChange={upd("defaultDiscount.enabled")} label="Apply a default discount to every order" /></div>
              <Select label="Type" value={d.defaultDiscount.mode} onChange={upd("defaultDiscount.mode")} options={[{ value: "percent", label: "Percent" }, { value: "fixed", label: "Fixed amount" }]} />
              <Input label="Value" type="number" min={0} step="any" value={d.defaultDiscount.value} onChange={upd("defaultDiscount.value")} />
              <Input wrapperClass="sm:col-span-2" label="Max manual discount for cashiers (%)" type="number" min={0} max={100} value={d.maxCashierDiscountPercent} onChange={upd("maxCashierDiscountPercent")} hint="Above this, a manager or owner must apply it" />
            </div>
            <SaveBtn keys={["defaultDiscount", "maxCashierDiscountPercent"]} />
          </>
        )}

        {tab === "types" && (
          <>
            <div className="space-y-4">
              {d.orderTypes.map((t, i) => (
                <div key={t.key} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3"><Input label="Label" value={t.label || ""} onChange={upd(`orderTypes.${i}.label`)} wrapperClass="w-48" /><Switch checked={t.enabled} onChange={upd(`orderTypes.${i}.enabled`)} label="Enabled" /></div>
                  <p className="mb-1.5 mt-3 text-xs font-semibold text-muted">Required at the POS</p>
                  <div className="flex flex-wrap gap-2">{Object.entries(FIELD_LABELS).map(([k, label]) => <button key={k} onClick={() => toggleIn(`orderTypes.${i}.requiredFields`, t.requiredFields, k)} className={`rounded-full px-3 py-1 text-xs font-semibold ${t.requiredFields.includes(k) ? "bg-primary text-white" : "border border-line"}`}>{label}</button>)}</div>
                </div>
              ))}
            </div>
            <SaveBtn keys={["orderTypes"]} />
          </>
        )}

        {tab === "payments" && (
          <>
            <div className="space-y-3">
              {d.paymentMethods.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2">
                  <Input label={i === 0 ? "Key" : undefined} value={m.key} onChange={(e) => upd(`paymentMethods.${i}.key`)(e.target.value.toLowerCase().replace(/\s+/g, "_"))} />
                  <Input label={i === 0 ? "Label" : undefined} value={m.label || ""} onChange={upd(`paymentMethods.${i}.label`)} />
                  <div className="pb-2"><Switch checked={m.enabled} onChange={upd(`paymentMethods.${i}.enabled`)} /></div>
                  <button onClick={() => upd("paymentMethods")(d.paymentMethods.filter((_, x) => x !== i))} aria-label="Remove" className="mb-1 grid size-9 place-items-center rounded-lg text-muted hover:bg-brick-soft hover:text-brick"><X className="size-4" /></button>
                </div>
              ))}
              <Button variant="outline" size="sm" icon={Plus} onClick={() => upd("paymentMethods")([...d.paymentMethods, { key: "", label: "", enabled: true }])}>Add method</Button>
            </div>
            <p className="mt-3 text-xs text-muted">At least one method must stay enabled. Cash gets the change calculator.</p>
            <SaveBtn keys={["paymentMethods"]} />
          </>
        )}

        {tab === "expenses" && (
          <>
            <div className="flex flex-wrap gap-2">
              {d.expenseCategories.map((c) => <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold capitalize text-brand">{c}<button onClick={() => upd("expenseCategories")(d.expenseCategories.filter((x) => x !== c))} aria-label={`Remove ${c}`}><X className="size-3.5" /></button></span>)}
            </div>
            <div className="mt-4 flex gap-2"><Input placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newCat.trim()) { upd("expenseCategories")([...new Set([...d.expenseCategories, newCat.trim().toLowerCase()])]); setNewCat(""); } }} />
              <Button variant="outline" icon={Plus} onClick={() => { if (newCat.trim()) { upd("expenseCategories")([...new Set([...d.expenseCategories, newCat.trim().toLowerCase()])]); setNewCat(""); } }}>Add</Button></div>
            <SaveBtn keys={["expenseCategories"]} />
          </>
        )}

        {tab === "invoice" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Invoice prefix" value={d.invoice.prefix} onChange={upd("invoice.prefix")} />
              <div className="flex items-end pb-2"><Switch checked={d.invoice.showTaxNumber} onChange={upd("invoice.showTaxNumber")} label="Show tax number" /></div>
              <Textarea wrapperClass="sm:col-span-2" label="Footer note" value={d.invoice.footerNote || ""} onChange={upd("invoice.footerNote")} />
            </div>
            <SaveBtn keys={["invoice"]} />
          </>
        )}

        {tab === "roles" && (
          !roles ? <Spinner /> : (
            <div className="overflow-x-auto">
              <p className="mb-3 text-sm text-muted">Roles and permissions are defined by the system and shown here read-only.</p>
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="border-b border-line text-left text-xs uppercase text-muted"><th className="py-2">Permission</th>{ROLE_ORDER.map((r) => <th key={r} className="px-2 py-2 text-center">{ROLE_META[r].label}</th>)}</tr></thead>
                <tbody>
                  {roles.allPermissions.map((p) => (
                    <tr key={p} className="border-b border-line last:border-0">
                      <td className="py-2 font-medium">{p}</td>
                      {ROLE_ORDER.map((r) => <td key={r} className="px-2 py-2 text-center">{roles.roles.find((x) => x.role === r)?.permissions.includes(p) ? <Check className="mx-auto size-4 text-brand" /> : <span className="text-muted">·</span>}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>
    </>
  );
}
