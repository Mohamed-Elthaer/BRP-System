import api from "./Axios";
import { unwrap, toFormData } from "./helpers";

export const getSettings = async () => unwrap(await api.get("/settings"));
export const updateSettings = async (d) => unwrap(await api.patch("/settings", d));
export const updateLogo = async (file) => unwrap(await api.patch("/settings/logo", toFormData({ logo: file })));
export const getRoles = async () => unwrap(await api.get("/settings/roles"));
