import api from "./Axios";
import { unwrap } from "./helpers";

export const getAll = async () => unwrap(await api.get("/categories"));
export const create = async (d) => unwrap(await api.post("/categories", d));
export const update = async (id, d) => unwrap(await api.patch(`/categories/${id}`, d));
export const remove = async (id) => unwrap(await api.delete(`/categories/${id}`));
