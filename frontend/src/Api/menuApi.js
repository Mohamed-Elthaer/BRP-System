import api from "./Axios";
import { unwrap, toFormData } from "./helpers";

const form = (d) =>
  toFormData({
    name: d.name, description: d.description, category: d.category, price: d.price,
    isAvailable: d.isAvailable, sortOrder: d.sortOrder, image: d.image,
  });

export const getAll = async () => unwrap(await api.get("/menu-items"));
export const create = async (d) => unwrap(await api.post("/menu-items", form(d)));
export const update = async (id, d) => unwrap(await api.patch(`/menu-items/${id}`, form(d)));
export const remove = async (id) => unwrap(await api.delete(`/menu-items/${id}`));
export const setAvailability = async (id, isAvailable) => unwrap(await api.patch(`/menu-items/${id}/availability`, { isAvailable }));
