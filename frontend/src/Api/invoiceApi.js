import api from "./Axios";
import { unwrap, params } from "./helpers";

export const getInvoices = async (p) => unwrap(await api.get("/invoices", { params: params(p) }));
export const getInvoice = async (id) => unwrap(await api.get(`/invoices/${id}`));
export const getInvoiceByOrder = async (orderId) => unwrap(await api.get(`/invoices/order/${orderId}`));
