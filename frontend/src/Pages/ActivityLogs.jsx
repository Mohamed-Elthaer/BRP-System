import { Fragment, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ScrollText } from "lucide-react";
import { fetchLogs } from "../Redux/Slices/logsSlice.js";
import { getLogActions } from "../Api/logApi.js";
import { dt, fullName } from "../Utils/format.js";
import { Pagination } from "../Components/ui/DataTable.jsx";
import { Badge, EmptyState, PageHeader, Skeleton } from "../Components/ui/Display.jsx";
import { Input, Select } from "../Components/ui/Fields.jsx";

export default function ActivityLogs() {
  const dispatch = useDispatch();
  const { items, meta, loading } = useSelector((s) => s.logs);
  const [actions, setActions] = useState([]);
  const [f, setF] = useState({ action: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); };

  useEffect(() => { getLogActions().then(setActions).catch(() => {}); }, []);
  useEffect(() => { dispatch(fetchLogs({ page, limit: 30, ...f })); }, [dispatch, page, f.action, f.from, f.to]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader title="Activity log" subtitle="Read-only record of sensitive actions. Nobody can edit or delete it" />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Select value={f.action} onChange={set("action")} placeholder="All actions" options={actions} />
        <Input type="date" aria-label="From" value={f.from} onChange={set("from")} />
        <Input type="date" aria-label="To" value={f.to} onChange={set("to")} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b border-line bg-primary-soft/50 text-left text-xs uppercase tracking-wide text-muted">
            {["When", "Who", "Action", "Entity"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {loading && !items.length && Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-5" /></td></tr>)}
            {items.map((l) => (
              <Fragment key={l._id}>
                <tr onClick={() => setOpen(open === l._id ? null : l._id)} className="cursor-pointer border-b border-line hover:bg-primary-soft/40">
                  <td className="px-4 py-3 text-muted">{dt(l.createdAt)}</td>
                  <td className="px-4 py-3"><span className="font-semibold">{fullName(l.user) || "—"}</span> <span className="text-xs text-muted">{l.userRole}</span></td>
                  <td className="px-4 py-3"><Badge tone={l.action.includes("cancel") || l.action.includes("refund") || l.action.includes("delete") ? "danger" : "success"}>{l.action}</Badge></td>
                  <td className="px-4 py-3 text-muted">{l.entity} {l.entityId ? `· ${String(l.entityId).slice(-6)}` : ""}</td>
                </tr>
                {open === l._id && (
                  <tr className="border-b border-line bg-bg"><td colSpan={4} className="px-4 py-3"><pre className="overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(l.details, null, 2)}</pre><p className="mt-1 text-xs text-muted">IP: {l.ip || "—"}</p></td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {!loading && !items.length && <EmptyState icon={ScrollText} title="No activity yet" />}
      </div>
      <Pagination meta={meta} onChange={setPage} />
    </>
  );
}
