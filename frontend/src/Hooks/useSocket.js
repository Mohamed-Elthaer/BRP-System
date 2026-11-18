import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { disconnectSocket, getSocket } from "../Utils/socket.js";
import { playChime } from "../Utils/sound.js";
import { orderEvent } from "../Redux/Slices/ordersSlice.js";
import { kitchenOrderUpserted } from "../Redux/Slices/kitchenSlice.js";
import { menuItemPatched } from "../Redux/Slices/menuSlice.js";

// أحداث الباك: order:created / order:updated / inventory:low / menu:updated
export default function useSocket() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  useEffect(() => {
    if (!user) return undefined;
    const socket = getSocket();
    socket.connect();

    const onCreated = (order) => {
      dispatch(orderEvent());
      dispatch(kitchenOrderUpserted(order));
      if (order.createdBy !== user._id) {
        toast.info(`New order #${order.orderNumber}`, { toastId: `order-${order._id}` });
        if (user.role === "kitchen") playChime();
      }
    };
    const onUpdated = (order) => {
      dispatch(orderEvent());
      dispatch(kitchenOrderUpserted(order));
    };
    const onLow = (items) =>
      toast.warn(`Low stock: ${items.map((i) => i.name).join(", ")}`, { toastId: "low-stock" });
    const onMenu = (patch) => dispatch(menuItemPatched(patch));

    socket.on("order:created", onCreated);
    socket.on("order:updated", onUpdated);
    socket.on("inventory:low", onLow);
    socket.on("menu:updated", onMenu);

    return () => {
      socket.off("order:created", onCreated);
      
      socket.off("order:updated", onUpdated);
      socket.off("inventory:low", onLow);
      socket.off("menu:updated", onMenu);
      disconnectSocket();
    };
  }, [user?._id, user?.role, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps
}
