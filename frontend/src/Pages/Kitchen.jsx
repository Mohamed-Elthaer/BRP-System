

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { Clock, Flame } from "lucide-react";

import {
  fetchKitchenOrders,
  moveKitchenOrder,
} from "../Redux/Slices/kitchenSlice.js";

import { ORDER_TYPES, PERM, STATUS_META } from "../Utils/constants.js";
import { minutesSince } from "../Utils/format.js";
import usePermission from "../Hooks/usePermission.js";
import Button from "../Components/ui/Button.jsx";
import {
  EmptyState,
  PageHeader,
  Spinner,
} from "../Components/ui/Display.jsx";

const COLUMNS = [
  {
    status: "new",
    title: "New",
    action: {
      to: "preparing",
      label: "Start preparing",
      variant: "saffron",
    },
  },
  {
    status: "preparing",
    title: "Preparing",
    action: {
      to: "ready",
      label: "Mark ready",
      variant: "primary",
    },
  },
  {
    status: "ready",
    title: "Ready",
    action: null,
  },
];

function Ticket({ order, action, canAct, onMove, busy }) {
  const mins = minutesSince(
    order.preparingAt && order.status !== "new"
      ? order.preparingAt
      : order.createdAt
  );

  const late = mins >= 15 && order.status !== "ready";

  const statusMeta = STATUS_META[order.status] || STATUS_META.new;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        type: "spring",
        damping: 24,
        stiffness: 300,
      }}
      className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
    >
      <div className={`h-1.5 ${statusMeta.bar}`} />

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-extrabold">
              #{order.orderNumber || `LOCAL-${order.operationId?.slice(0, 6)}`}
            </p>

            <p className="text-xs font-semibold text-muted">
              {ORDER_TYPES.find((t) => t.key === order.orderType)?.label ||
                order.orderType}
              {order.tableNumber
                ? ` · Table ${order.tableNumber}`
                : ""}
            </p>

            {(order.isLocal || order.pendingStatusSync) && (
              <span className="mt-2 inline-block rounded-full bg-saffron-soft px-2 py-1 text-xs font-bold text-saffron">
                Pending Sync
              </span>
            )}
          </div>

          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
              late
                ? "bg-brick-soft text-brick"
                : "bg-bg text-muted"
            }`}
          >
            <Clock className="size-3.5" />
            {mins}m
          </span>
        </div>

        <ul className="mt-3 space-y-1.5">
          {(order.items || []).map((item, idx) => (
            <li key={idx} className="text-sm">
              <span className="mr-1.5 inline-grid min-w-6 place-items-center rounded-md bg-primary-soft px-1 font-extrabold text-brand">
                {item.quantity}
              </span>

              <span className="font-semibold">
                {item.name || item.menuItem?.name || "Item"}
              </span>

              {item.notes && (
                <p className="ml-8 text-xs font-medium text-saffron">
                  “{item.notes}”
                </p>
              )}
            </li>
          ))}
        </ul>

        {order.notes && (
          <p className="mt-3 rounded-lg bg-saffron-soft px-2.5 py-1.5 text-xs font-medium text-saffron">
            Note: {order.notes}
          </p>
        )}

        {action && canAct && (
          <Button
            variant={action.variant}
            className="mt-4 w-full"
            loading={busy}
            onClick={() => onMove(order, action.to)}
          >
            {action.label}
          </Button>
        )}

        {!action && (
          <p className="mt-4 text-center text-xs font-semibold text-muted">
            Waiting for pickup
          </p>
        )}
      </div>
    </motion.article>
  );
}

export default function Kitchen() {
  const dispatch = useDispatch();
  const { can } = usePermission();

  const { orders: serverOrders, loading } = useSelector(
    (state) => state.kitchen
  );

  const queue = useSelector(
    (state) => state.sync.queue || []
  );

  const [busyId, setBusyId] = useState(null);
  const [, tick] = useState(0);

  // Fetch server orders
  useEffect(() => {
    dispatch(fetchKitchenOrders());
  }, [dispatch]);

  // Refresh elapsed-time display every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      tick((n) => n + 1);
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // Build local kitchen orders from the offline queue
  const localOrders = useMemo(() => {
    return queue
      .filter(
        (operation) =>
          operation.type === "create_order" &&
          !operation.payload?.payment
      )
      .map((operation) => {
        const statusOperations = queue.filter(
          (item) =>
            item.type === "update_order_status" &&
            item.payload?.orderOperationId === operation.operationId
        );

        const lastStatusOperation =
          statusOperations[statusOperations.length - 1];

        return {
          _id: `local-${operation.operationId}`,
          operationId: operation.operationId,
          clientOperationId: operation.operationId,
          orderNumber: `LOCAL-${operation.operationId.slice(0, 6)}`,
          isLocal: true,

          status: lastStatusOperation
            ? lastStatusOperation.payload.status
            : "new",

          orderType: operation.payload.orderType,
          items: operation.payload.items || [],
          tableNumber: operation.payload.tableNumber || "",
          customerName: operation.payload.customerName || "",
          customerPhone: operation.payload.customerPhone || "",
          deliveryAddress: operation.payload.deliveryAddress || "",
          notes: operation.payload.notes || "",
          createdAt: operation.clientCreatedAt,
        };
      });
  }, [queue]);

  // Merge server orders with local orders
  const orders = useMemo(() => {
    const localIds = new Set(
      localOrders.map((order) => order.operationId)
    );

    const filteredServerOrders = serverOrders.filter(
      (order) => !localIds.has(order.clientOperationId)
    );

    return [...filteredServerOrders, ...localOrders].sort(
      (a, b) =>
        new Date(a.createdAt) - new Date(b.createdAt)
    );
  }, [serverOrders, localOrders]);

  // Change order status
  const move = async (order, status) => {
    setBusyId(order._id);

    try {
      const result = await dispatch(
        moveKitchenOrder({ order, status })
      ).unwrap();

      if (result?.queued) {
        toast.info("Status saved locally. Waiting for sync.");
      } else {
        toast.success("Order status updated.");
      }
    } catch (error) {
      toast.error(
        typeof error === "string"
          ? error
          : error?.message || "Failed to update order status"
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Kitchen"
        subtitle="New orders appear here the moment they're sent"
        actions={
          <span className="flex items-center gap-1.5 rounded-full bg-saffron-soft px-3 py-1.5 text-xs font-bold text-saffron">
            <Flame className="size-3.5" />
            {orders.length} active
          </span>
        }
      />

      {loading && !orders.length ? (
        <div className="grid place-items-center py-20">
          <Spinner className="size-8" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const list = orders.filter(
              (order) => order.status === col.status
            );

            return (
              <section key={col.status}>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={`size-3 rounded-full ${
                      STATUS_META[col.status].bar
                    }`}
                  />

                  <h2 className="font-bold">
                    {col.title}
                  </h2>

                  <span className="rounded-full bg-line px-2 text-xs font-bold text-muted">
                    {list.length}
                  </span>
                </div>

                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {list.map((order) => (
                      <Ticket
                        key={order._id}
                        order={order}
                        action={col.action}
                        canAct={can(PERM.KITCHEN_UPDATE)}
                        onMove={move}
                        busy={busyId === order._id}
                      />
                    ))}
                  </AnimatePresence>

                  {!list.length && (
                    <div className="rounded-2xl border border-dashed border-line">
                      <EmptyState title="Nothing here" />
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
