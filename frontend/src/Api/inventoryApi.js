import api from "./Axios";
import { unwrap, params } from "./helpers";

export const getStock = async (p) => unwrap(await api.get("/inventory", { params: params(p) }));
export const getTransactions = async (p) => unwrap(await api.get("/inventory/transactions", { params: params(p) }));
export const addPurchase = async (d) => unwrap(await api.post("/inventory/purchases", d));
export const recordWaste = async (d) => unwrap(await api.post("/inventory/waste", d));
export const stocktake = async (d) => unwrap(await api.post("/inventory/stocktake", d));
