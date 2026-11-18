import { createSlice } from "@reduxjs/toolkit";
import { makeThunk } from "../helpers.js";
import * as orderApi from "../../Api/orderApi.js";
import * as paymentApi from "../../Api/paymentApi.js";

export const fetchOrders = makeThunk("orders/fetchAll", orderApi.getOrders, "Failed to load orders");
export const fetchOrderById = makeThunk("orders/fetchOne", orderApi.getOrderById, "Failed to load order");
export const changeOrderStatus = makeThunk("orders/status", ({ id, status, note }) => orderApi.updateOrderStatus(id, status, note), "Failed to update status");
export const cancelOrderThunk = makeThunk("orders/cancel", ({ id, ...d }) => orderApi.cancelOrder(id, d), "Failed to cancel order");
export const payOrderThunk = makeThunk("orders/pay", ({ id, ...d }) => paymentApi.payOrder(id, d), "Payment failed");
export const refundOrderThunk = makeThunk("orders/refund", ({ id, reason }) => paymentApi.refundOrder(id, reason), "Refund failed");

const ordersSlice = createSlice({
  name: "orders",
  initialState: {
    items: [], meta: { page: 1, limit: 20, total: 0, pages: 1 }, loading: false, error: null,
    current: null, currentLoading: false,
    liveTick: 0, // بيزيد مع أي حدث socket، والصفحات بتعمل refetch عليه
  },
  reducers: { orderEvent: (s) => { s.liveTick += 1; } },
  extraReducers: (b) => {
    b.addCase(fetchOrders.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchOrders.fulfilled, (s, a) => {
        const { orders, page, limit, total, pages } = a.payload;
        s.loading = false; s.items = orders; s.meta = { page, limit, total, pages };
      })
      .addCase(fetchOrders.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(fetchOrderById.pending, (s, a) => {
        // مانفضيش البيانات لو بنعمل refresh لنفس الأوردر
        if (s.current?.order?._id !== a.meta.arg) s.current = null;
        s.currentLoading = true;
      })
      .addCase(fetchOrderById.fulfilled, (s, a) => { s.currentLoading = false; s.current = a.payload; })
      .addCase(fetchOrderById.rejected, (s) => { s.currentLoading = false; });
  },
});

export const { orderEvent } = ordersSlice.actions;
export default ordersSlice.reducer;
