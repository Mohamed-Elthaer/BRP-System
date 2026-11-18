import api from "./Axios";
import { unwrap } from "./helpers";

export const getKitchenOrders = async () => unwrap(await api.get("/kitchen/orders"));
export const setKitchenStatus = async (id, status) => unwrap(await api.patch(`/kitchen/orders/${id}/status`, { status }));
