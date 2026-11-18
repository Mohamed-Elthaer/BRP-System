import { createSlice } from "@reduxjs/toolkit";
import { makeThunk } from "../helpers.js";
import * as inventoryApi from "../../Api/inventoryApi.js";
import { createPagedSlice } from "../pagedSliceFactory.js";

export const fetchStock = makeThunk("inventory/stock", inventoryApi.getStock, "Failed to load stock");
export const addPurchase = makeThunk("inventory/purchase", inventoryApi.addPurchase, "Failed to record purchase");
export const recordWaste = makeThunk("inventory/waste", inventoryApi.recordWaste, "Failed to record waste");
export const submitStocktake = makeThunk("inventory/stocktake", inventoryApi.stocktake, "Failed to submit stocktake");

const inventorySlice = createSlice({
  name: "inventory",
  initialState: { items: [], totalValue: 0, loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchStock.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchStock.fulfilled, (s, a) => { s.loading = false; s.items = a.payload.items; s.totalValue = a.payload.totalValue; })
      .addCase(fetchStock.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

const tx = createPagedSlice({ name: "inventoryTx", fetcher: inventoryApi.getTransactions, key: "transactions", label: "transactions" });
export const fetchTransactions = tx.fetchPage;
export const inventoryTxReducer = tx.reducer;
export default inventorySlice.reducer;
