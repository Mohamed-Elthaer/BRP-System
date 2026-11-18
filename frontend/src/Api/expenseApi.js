import api from "./Axios";
import { unwrap, toFormData, params } from "./helpers";

const form = (d) => toFormData({ amount: d.amount, category: d.category, description: d.description, date: d.date, receipts: d.receipts });

export const getExpenses = async (p) => unwrap(await api.get("/expenses", { params: params(p) }));
export const getExpenseSummary = async (p) => unwrap(await api.get("/expenses/summary", { params: params(p) }));
export const createExpense = async (d) => unwrap(await api.post("/expenses", form(d)));
export const updateExpense = async (id, d) => unwrap(await api.patch(`/expenses/${id}`, form(d)));
export const removeReceipt = async (id, publicId) => unwrap(await api.delete(`/expenses/${id}/receipts`, { params: { publicId } }));
export const deleteExpense = async (id) => api.delete(`/expenses/${id}`);
