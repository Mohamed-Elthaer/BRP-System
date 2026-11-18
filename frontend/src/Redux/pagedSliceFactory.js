import { createSlice } from "@reduxjs/toolkit";
import { makeThunk } from "./helpers.js";

/*
 * slice للقوائم المقسّمة صفحات. الباك بيرجّع { [key]: [...], page, limit, total, pages, ...extra }
 * فبنحط القائمة في items والترقيم في meta وأي حقول زيادة (زي totalAmount) في extra
 */
export const createPagedSlice = ({ name, fetcher, key, label }) => {
  const fetchPage = makeThunk(`${name}/fetchPage`, fetcher, `Failed to load ${label}`);

  const slice = createSlice({
    name,
    initialState: { items: [], meta: { page: 1, limit: 20, total: 0, pages: 1 }, extra: {}, loading: false, error: null },
    reducers: {},
    extraReducers: (b) => {
      b.addCase(fetchPage.pending, (s) => { s.loading = true; s.error = null; })
        .addCase(fetchPage.fulfilled, (s, a) => {
          const { page, limit, total, pages, [key]: items, ...extra } = a.payload;
          s.loading = false;
          s.items = items || [];
          s.meta = { page, limit, total, pages };
          s.extra = extra;
        })
        .addCase(fetchPage.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
    },
  });

  return { reducer: slice.reducer, fetchPage };
};
