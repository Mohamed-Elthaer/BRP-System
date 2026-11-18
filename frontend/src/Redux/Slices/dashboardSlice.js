import { createSlice } from "@reduxjs/toolkit";
import { makeThunk } from "../helpers.js";
import * as dashboardApi from "../../Api/dashboardApi.js";

export const fetchDashboard = makeThunk("dashboard/fetch", dashboardApi.getDashboard, "Failed to load dashboard");

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState: { data: null, loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchDashboard.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchDashboard.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; })
      .addCase(fetchDashboard.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export default dashboardSlice.reducer;
