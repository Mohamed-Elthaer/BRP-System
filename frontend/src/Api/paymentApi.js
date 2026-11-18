import api from "./Axios";
import { unwrap, params } from "./helpers";

export const getPayments = async (p) => unwrap(await api.get("/payments", { params: params(p) }));
export const payOrder = async (orderId, d) => unwrap(await api.post(`/payments/orders/${orderId}`, d));
export const refundOrder = async (orderId, reason) => unwrap(await api.post(`/payments/orders/${orderId}/refund`, { reason }));
