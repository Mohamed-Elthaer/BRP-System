import { createSlice } from "@reduxjs/toolkit";
import { makeThunk } from "../helpers.js";
import * as expenseApi from "../../Api/expenseApi.js";
import { createPagedSlice } from "../pagedSliceFactory.js";

const paged = createPagedSlice({ name: "expenses", fetcher: expenseApi.getExpenses, key: "expenses", label: "expenses" });
export const fetchExpenses = paged.fetchPage; // extra.totalAmount = إجمالي النتائج المفلترة
export const expensesReducer = paged.reducer;

export const fetchExpenseSummary = makeThunk("expenses/summary", expenseApi.getExpenseSummary, "Failed to load summary");
export const createExpense = makeThunk("expenses/create", expenseApi.createExpense, "Failed to create expense");
export const updateExpense = makeThunk("expenses/update", ({ id, data }) => expenseApi.updateExpense(id, data), "Failed to update expense");
export const deleteExpense = makeThunk("expenses/delete", expenseApi.deleteExpense, "Failed to delete expense");
export const removeExpenseReceipt = makeThunk("expenses/removeReceipt", ({ id, publicId }) => expenseApi.removeReceipt(id, publicId), "Failed to remove receipt");

const summarySlice = createSlice({
  name: "expenseSummary",
  initialState: { data: null, loading: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchExpenseSummary.pending, (s) => { s.loading = true; })
      .addCase(fetchExpenseSummary.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; })
      .addCase(fetchExpenseSummary.rejected, (s) => { s.loading = false; });
  },
});
export const expenseSummaryReducer = summarySlice.reducer;
