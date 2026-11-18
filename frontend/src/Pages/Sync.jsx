import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { dismissSyncOp, fetchSyncStatus, pushQueue, retrySyncOp } from "../Redux/Slices/syncSlice.js";
import { PERM } from "../Utils/constants.js";
import { dt } from "../Utils/format.js";
import usePermission from "../Hooks/usePermission.js";
import useOnlineStatus from "../Hooks/useOnlineStatus.js";
import Button from "../Components/ui/Button.jsx";
import { ConfirmDialog } from "../Components/ui/Modal.jsx";
import { Textarea } from "../Components/ui/Fields.jsx";
import { Badge, Card, EmptyState, PageHeader, StatCard } from "../Components/ui/Display.jsx";

const ACCENT = { pending: "saffron", done: "primary", failed: "brick", conflict: "brick", dismissed: "primary" };

export default function Sync() {
  const dispatch = useDispatch();
  const { can } = usePermission();
  const online = useOnlineStatus();
  const { queue, syncing, counts, attention } = useSelector((s) => s.sync);
  const [dismissing, setDismissing] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(null);

  const refresh = () => dispatch(fetchSyncStatus());
  useEffect(() => { refresh(); }, [queue.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncNow = async () => {
    try {
      const { results } = await dispatch(pushQueue()).unwrap();
      toast.info(results.length ? `${results.filter((r) => r.status === "done").length} of ${results.length} synced` : "Nothing to sync");
      refresh();
    } catch (err) { toast.error(err || "Sync failed"); }
  };

  const retry = async (op) => {
    setBusy(op.operationId);
    try { const r = await dispatch(retrySyncOp(op.operationId)).unwrap(); r.status === "done" ? toast.success("Operation completed") : toast.warn(r.error || "Still failing"); refresh(); } catch (err) { toast.error(err); }
    setBusy(null);
  };

  const dismiss = async () => {
    if (!note.trim()) return toast.error("Add a note explaining the resolution");
    try { await dispatch(dismissSyncOp({ operationId: dismissing.operationId, note })).unwrap(); toast.success("Dismissed"); setDismissing(null); setNote(""); refresh(); } catch (err) { toast.error(err); }
  };

  return (
    <>
      <PageHeader title="Sync" subtitle="Orders created offline are saved here until the server confirms them"
        actions={<Button icon={RefreshCw} loading={syncing} disabled={!online || !queue.length} onClick={syncNow}>Sync now</Button>} />
      {!online && <p className="mb-4 rounded-xl bg-brick-soft px-4 py-3 text-sm font-semibold text-brick">You&apos;re offline. Pending operations will send automatically when the connection returns.</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Waiting on this device" value={queue.length} accent="saffron" />
        <StatCard index={1} label="Synced" value={counts.done} />
        <StatCard index={2} label="Need attention" value={counts.failed + counts.conflict} accent={counts.failed + counts.conflict ? "brick" : "primary"} />
        <StatCard index={3} label="Dismissed" value={counts.dismissed} accent={ACCENT.dismissed} />
      </div>

      <h2 className="mb-3 font-bold">Waiting on this device</h2>
      <Card className="mb-6 p-0">
        {!queue.length ? <EmptyState icon={CheckCircle2} title="Everything is synced" /> : queue.map((op) => (
          <div key={op.operationId} className="flex items-center justify-between border-b border-line px-5 py-3 text-sm last:border-0">
            <span className="font-semibold capitalize">{op.type.replace("_", " ")}</span>
            <span className="text-muted">{dt(op.clientCreatedAt)}</span>
            <Badge tone="warn">Pending</Badge>
          </div>
        ))}
      </Card>

      <h2 className="mb-3 font-bold">Needs attention</h2>
      <Card className="p-0">
        {!attention.length ? <EmptyState icon={CheckCircle2} title="No failed or conflicting operations" /> : attention.map((op) => (
          <div key={op.operationId} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 text-sm last:border-0">
            <div className="min-w-0 flex-1">
              <p className="font-semibold capitalize">{op.type.replace("_", " ")} <Badge tone="danger" className="ml-1">{op.status}</Badge></p>
              <p className="text-brick">{op.error}</p>
              <p className="text-xs text-muted">{dt(op.createdAt)} · {op.attempts} attempt(s)</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" loading={busy === op.operationId} onClick={() => retry(op)}>Retry</Button>
              {can(PERM.ORDERS_CANCEL) && <Button size="sm" variant="ghost" onClick={() => setDismissing(op)}>Dismiss</Button>}
            </div>
          </div>
        ))}
      </Card>

      <ConfirmDialog open={!!dismissing} onClose={() => setDismissing(null)} onConfirm={dismiss} title="Dismiss this operation?" confirmLabel="Dismiss" message="Use this once you've handled it manually (for example, re-entered the order).">
        <div className="mt-3"><Textarea label="Resolution note (required)" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      </ConfirmDialog>
    </>
  );
}
