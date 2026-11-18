import api from "./Axios";
import { unwrap } from "./helpers";

export const getAll = async () => unwrap(await api.get("/ingredients"));
export const create = async (d) => unwrap(await api.post("/ingredients", d));
export const update = async (id, d) => unwrap(await api.patch(`/ingredients/${id}`, d));
export const remove = async (id) => unwrap(await api.delete(`/ingredients/${id}`));
