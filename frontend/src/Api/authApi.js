import api from "./Axios";
import { unwrap } from "./helpers";

export const setupOwner = async (data) => unwrap(await api.post("/users/register", data));
export const loginUser = async (data) => unwrap(await api.post("/users/login", data));
export const logoutUser = async () => api.post("/users/logout");
export const getMyProfileUser = async () => unwrap(await api.get("/users/me"));
export const changeMyPassword = async (data) => api.patch("/users/me/password", data);
