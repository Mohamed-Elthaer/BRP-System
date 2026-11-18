import * as api from "../../Api/ingredientApi.js";
import { createCrudSlice } from "../crudSliceFactory.js";

const crud = createCrudSlice({ name: "ingredient", api, label: "ingredient" });

export const { fetchAll: fetchIngredients, createOne: createIngredient, updateOne: updateIngredient, removeOne: deleteIngredient } = crud.thunks;
export default crud.reducer;
