import { createSlice } from "@reduxjs/toolkit";
import { makeThunk } from "./helpers.js";

const readCache = (key) => {
  try {
    return key ? JSON.parse(localStorage.getItem(key) || "[]") : [];
  } catch {
    return [];
  }
};

/*
 * slice لقوائم الـ CRUD البسيطة (categories / menu / ingredients / suppliers).
 * القائمة بتتحدث بس من fetchAll، والصفحة بتعمل refetch بعد أي إنشاء/تعديل/حذف
 * (عشان الـ populate بتاع الباك يفضل صح). persistKey بيحفظ نسخة للـ POS أوفلاين.
 */
export const createCrudSlice = ({ name, api, label, persistKey, reducers = {} }) => {
  const fetchAll = makeThunk(`${name}/fetchAll`, (p) => api.getAll(p), `Failed to load ${label}`);
  const createOne = makeThunk(`${name}/create`, (data) => api.create(data), `Failed to create ${label}`);
  const updateOne = makeThunk(`${name}/update`, ({ id, data }) => api.update(id, data), `Failed to update ${label}`);
  const removeOne = makeThunk(`${name}/remove`, (id) => api.remove(id), `Failed to remove ${label}`);

  const slice = createSlice({
    name,
    initialState: { items: readCache(persistKey), loading: false, saving: false, error: null },
    reducers,
    extraReducers: (b) => {
      b.addCase(fetchAll.pending, (s) => { s.loading = true; s.error = null; })
        .addCase(fetchAll.fulfilled, (s, a) => {
          s.loading = false;
          s.items = a.payload;
          if (persistKey) {
            try { localStorage.setItem(persistKey, JSON.stringify(a.payload)); } catch {}
          }
        })
        .addCase(fetchAll.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
      [createOne, updateOne, removeOne].forEach((t) =>
        b.addCase(t.pending, (s) => { s.saving = true; })
          .addCase(t.fulfilled, (s) => { s.saving = false; })
          .addCase(t.rejected, (s) => { s.saving = false; }),
      );
    },
  });

  return { reducer: slice.reducer, actions: slice.actions, thunks: { fetchAll, createOne, updateOne, removeOne } };
};
