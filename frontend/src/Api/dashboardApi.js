import api from "./Axios";
import { unwrap, params } from "./helpers";

export const getDashboard = async (p) => unwrap(await api.get("/dashboard", { params: params(p) }));
