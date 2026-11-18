import api from "./Axios";
import { unwrap } from "./helpers";

export const getAll = async () => unwrap(await api.get("/suppliers"));
export const create = async (d) => unwrap(await api.post("/suppliers", d));
export const update = async (id, d) => unwrap(await api.patch(`/suppliers/${id}`, d));
export const remove = async (id) => unwrap(await api.delete(`/suppliers/${id}`));
