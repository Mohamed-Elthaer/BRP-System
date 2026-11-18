import { createSlice } from "@reduxjs/toolkit";
import { makeThunk } from "../helpers.js";
import * as recipeApi from "../../Api/recipeApi.js";

export const fetchRecipes = makeThunk("recipes/fetchAll", recipeApi.getRecipes, "Failed to load recipes");
export const fetchRecipe = makeThunk("recipes/fetchOne", recipeApi.getRecipe, "Recipe not found");
export const saveRecipe = makeThunk("recipes/save", ({ menuItemId, data }) => recipeApi.saveRecipe(menuItemId, data), "Failed to save recipe");
export const removeRecipe = makeThunk("recipes/remove", recipeApi.deleteRecipe, "Failed to delete recipe");

const recipesSlice = createSlice({
  name: "recipes",
  initialState: { list: [], current: null, loading: false, currentLoading: false, error: null },
  reducers: { clearCurrent: (s) => { s.current = null; } },
  extraReducers: (b) => {
    b.addCase(fetchRecipes.pending, (s) => { s.loading = true; })
      .addCase(fetchRecipes.fulfilled, (s, a) => { s.loading = false; s.list = a.payload; })
      .addCase(fetchRecipes.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(fetchRecipe.pending, (s) => { s.currentLoading = true; s.current = null; })
      .addCase(fetchRecipe.fulfilled, (s, a) => { s.currentLoading = false; s.current = a.payload; })
      .addCase(fetchRecipe.rejected, (s) => { s.currentLoading = false; s.current = null; }) // مفيش recipe لسه
      .addCase(saveRecipe.fulfilled, (s, a) => { s.current = a.payload; });
  },
});

export const { clearCurrent } = recipesSlice.actions;
export default recipesSlice.reducer;
