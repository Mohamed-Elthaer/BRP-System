import api from "./Axios";
import { unwrap } from "./helpers";

export const getRecipes = async () => unwrap(await api.get("/recipes"));
export const getRecipe = async (menuItemId) => unwrap(await api.get(`/recipes/${menuItemId}`));
export const saveRecipe = async (menuItemId, d) => unwrap(await api.put(`/recipes/${menuItemId}`, d));
export const deleteRecipe = async (menuItemId) => api.delete(`/recipes/${menuItemId}`);
