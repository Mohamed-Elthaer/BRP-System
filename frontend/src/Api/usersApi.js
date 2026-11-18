import api from "./Axios";
import { unwrap, toFormData, params } from "./helpers";

const userForm = (d) =>
  toFormData({
    firstName: d.firstName, lastName: d.lastName, email: d.email, password: d.password,
    phone: d.phone, role: d.role, jobTitle: d.jobTitle, salary: d.salary, hireDate: d.hireDate, avatar: d.avatar,
  });

export const updateMyprofileUser = async (d) =>
  unwrap(await api.patch("/users/me", toFormData({ firstName: d.firstName, lastName: d.lastName, phone: d.phone, avatar: d.avatar })));

export const getAllUsers = async (p) => unwrap(await api.get("/users", { params: params(p) }));
export const getSingleUser = async (id) => unwrap(await api.get(`/users/${id}`));
export const createUser = async (d) => unwrap(await api.post("/users", userForm(d)));
export const updateUser = async (id, d) => unwrap(await api.patch(`/users/${id}`, userForm(d)));
export const setUserStatus = async (id, isActive) => unwrap(await api.patch(`/users/${id}/status`, { isActive }));
export const resetUserPassword = async (id, newPassword) => api.patch(`/users/${id}/password`, { newPassword });
