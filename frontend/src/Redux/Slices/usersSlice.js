import { makeThunk } from "../helpers.js";
import * as usersApi from "../../Api/usersApi.js";
import { createPagedSlice } from "../pagedSliceFactory.js";

const paged = createPagedSlice({ name: "users", fetcher: usersApi.getAllUsers, key: "users", label: "employees" });
export const fetchUsers = paged.fetchPage;

export const createEmployee = makeThunk("users/create", usersApi.createUser, "Failed to create employee");
export const updateEmployee = makeThunk("users/update", ({ id, data }) => usersApi.updateUser(id, data), "Failed to update employee");
export const changeEmployeeStatus = makeThunk("users/status", ({ id, isActive }) => usersApi.setUserStatus(id, isActive), "Failed to change status");
export const resetEmployeePassword = makeThunk("users/resetPassword", ({ id, newPassword }) => usersApi.resetUserPassword(id, newPassword), "Failed to reset password");

export default paged.reducer;
