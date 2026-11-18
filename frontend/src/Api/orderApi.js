import api from "./Axios";
import { unwrap, params } from "./helpers";

export const createOrder = async (d) => unwrap(await api.post("/orders", d));
export const getOrders = async (p) => unwrap(await api.get("/orders", { params: params(p) }));
export const getOrderById = async (id) => unwrap(await api.get(`/orders/${id}`));
export const updateOrderStatus = async (id, status, note) => unwrap(await api.patch(`/orders/${id}/status`, { status, note }));
export const cancelOrder = async (id, d) => unwrap(await api.post(`/orders/${id}/cancel`, d));
