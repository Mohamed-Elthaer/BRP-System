import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { CheckCircle2, Cloud, CloudOff, Database, RefreshCw } from "lucide-react";
import { dismissSyncOp, fetchSyncStatus, pushQueue, retrySyncOp, triggerCloudSyncThunk } from "../Redux/Slices/syncSlice.js";
import { PERM } from "../Utils/constants.js";
import { dt } from "../Utils/format.js";
import usePermission from "../Hooks/usePermission.js";
import useOnlineStatus from "../Hooks/useOnlineStatus.js";
import Button from "../Components/ui/Button.jsx";
import { ConfirmDialog } from "../Components/ui/Modal.jsx";
import { Textarea } from "../Components/ui/Fields.jsx";
import { Badge, Card, EmptyState, PageHeader, StatCard } from "../Components/ui/Display.jsx";

const ACCENT = { pending: "primary", done: "primary", failed: "brick", conflict: "brick", dismissed: "primary" };

export default function Sync() {
  const dispatch = useDispatch();
  const { can } = usePermission();
  const online = useOnlineStatus();
  const { queue, syncing, counts, attention, cloud } = useSelector((s) => s.sync);
  const [dismissing, setDismissing] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(null);

  const refresh = () => dispatch(fetchSyncStatus());
  useEffect(() => { refresh(); }, [queue.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncNow = async () => {
    try {
      if (queue.length) {
        await dispatch(pushQueue()).unwrap();
      }
      const res = await dispatch(triggerCloudSyncThunk()).unwrap();
      const c = res?.cloud;
      if (c?.cloudConnected) {
        toast.success(`Cloud Sync complete (Pushed: ${c.lastPushCount || 0}, Pulled: ${c.lastPullCount || 0})`);
      } else {
        toast.info("Saved to local database. Cloud sync will resume when internet returns.");
      }
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
      <PageHeader title="Sync & Offline Engine" subtitle="All data is saved instantaneously to the local database and automatically synchronized with Cloud Atlas"
        actions={<Button icon={RefreshCw} loading={syncing || cloud?.syncing} onClick={syncNow}>Sync with Cloud Now</Button>} />
      {!online && <p className="mb-4 rounded-xl bg-brick-soft px-4 py-3 text-sm font-semibold text-brick">You&apos;re operating in Offline Mode. All POS, Kitchen, Inventory &amp; Reports work locally and will sync to the cloud automatically when internet returns.</p>}

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary shadow-xs">
            {cloud?.cloudConnected ? <Cloud className="size-5" /> : <CloudOff className="size-5" />}
          </div>
          <div>
            <p className="font-bold flex items-center gap-2">
              Database Mode: <span className="uppercase">{cloud?.dbMode || "local"}</span>
              <Badge tone={cloud?.cloudConnected ? "success" : "neutral"}>
                {cloud?.cloudConnected ? "Cloud Connected" : "Local Offline-First"}
              </Badge>
            </p>
            <p className="text-xs text-muted">
              {cloud?.lastSyncedAt ? `Last cloud sync: ${dt(cloud.lastSyncedAt)}` : "Waiting for initial cloud sync cycle"}
              {cloud?.pendingOutboxCount > 0 ? ` · ${cloud.pendingOutboxCount} local change(s) queued for cloud push` : " · All local records synced"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Database className="size-4" />
          <span>Embedded MongoDB + Atlas Bidirectional Sync</span>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Pending Cloud Push" value={(cloud?.pendingOutboxCount || 0) + queue.length} accent="primary" />
        <StatCard index={1} label="Synced Operations" value={counts.done} />
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
