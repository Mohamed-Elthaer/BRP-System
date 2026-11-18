import api from "./Axios";
import { unwrap, params } from "./helpers";

export const getLogs = async (p) => unwrap(await api.get("/activity-logs", { params: params(p) }));
export const getLogActions = async () => unwrap(await api.get("/activity-logs/actions"));
