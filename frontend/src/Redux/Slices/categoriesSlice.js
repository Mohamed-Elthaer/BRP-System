import * as api from "../../Api/categoryApi.js";
import { createCrudSlice } from "../crudSliceFactory.js";

const crud = createCrudSlice({ name: "category", api, label: "category", persistKey: "cache:categories" });

export const { fetchAll: fetchCategories, createOne: createCategory, updateOne: updateCategory, removeOne: deleteCategory } = crud.thunks;
export default crud.reducer;
