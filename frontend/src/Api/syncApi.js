import api from "./Axios";
import { unwrap, params } from "./helpers";

export const pushOperations = async (operations) => unwrap(await api.post("/sync/push", { operations }));
export const getSyncStatus = async () => unwrap(await api.get("/sync/status"));
export const getSyncOperations = async (p) => unwrap(await api.get("/sync/operations", { params: params(p) }));
export const retryOperation = async (operationId) => unwrap(await api.post(`/sync/operations/${operationId}/retry`));
export const dismissOperation = async (operationId, note) => unwrap(await api.post(`/sync/operations/${operationId}/dismiss`, { note }));
