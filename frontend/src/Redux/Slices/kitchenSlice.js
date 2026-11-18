// import { createSlice } from "@reduxjs/toolkit";
// import { makeThunk } from "../helpers.js";
// import * as kitchenApi from "../../Api/kitchenApi.js";

// export const fetchKitchenOrders = makeThunk("kitchen/fetch", kitchenApi.getKitchenOrders, "Failed to load kitchen orders");
// export const moveKitchenOrder = makeThunk("kitchen/move", ({ id, status }) => kitchenApi.setKitchenStatus(id, status), "Failed to update order");

// const ACTIVE = ["new", "preparing", "ready"];


// const kitchenSlice = createSlice({
//   name: "kitchen",
//   initialState: { orders: [], loading: false, error: null },
//   reducers: {
//     // تحديث لحظي: الأوردر النشط بيتضاف/يتحدث، وغير النشط بيتشال
//     kitchenOrderUpserted: (s, a) => {
//       const o = a.payload;
//       const i = s.orders.findIndex((x) => x._id === o._id);
//       if (ACTIVE.includes(o.status)) {
//         if (i >= 0) s.orders[i] = o;
//         else s.orders.push(o);
//         s.orders.sort((x, y) => new Date(x.createdAt) - new Date(y.createdAt));
//       } else if (i >= 0) s.orders.splice(i, 1);
//     },
   
//   },
//   extraReducers: (b) => {
//     b.addCase(fetchKitchenOrders.pending, (s) => { s.loading = true; s.error = null; })
//       .addCase(fetchKitchenOrders.fulfilled, (s, a) => { s.loading = false; s.orders = a.payload; })
//       .addCase(fetchKitchenOrders.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
//       .addCase(moveKitchenOrder.fulfilled, (s, a) => {
//         const o = a.payload;
//         const i = s.orders.findIndex((x) => x._id === o._id);
//         if (ACTIVE.includes(o.status)) { if (i >= 0) s.orders[i] = { ...s.orders[i], ...o }; }
//         else if (i >= 0) s.orders.splice(i, 1);
//       });
//   },
// });

// export const { kitchenOrderUpserted } = kitchenSlice.actions;
// export default kitchenSlice.reducer;

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import * as kitchenApi from "../../Api/kitchenApi.js";
import { enqueueOperation } from "./syncSlice.js";

import { errMsg, isUnreachable } from "../helpers.js";
import { uuid } from "../../Utils/format.js";

const ACTIVE = ["new", "preparing", "ready"];

export const fetchKitchenOrders = createAsyncThunk(
  "kitchen/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await kitchenApi.getKitchenOrders();
    } catch (error) {
      return rejectWithValue(
        errMsg(error, "Failed to load kitchen orders")
      );
    }
  }
);

export const moveKitchenOrder = createAsyncThunk(
  "kitchen/move",
  async ({ order, status }, { dispatch, rejectWithValue }) => {
    const operationId = uuid();

    const operation = {
      operationId,
      type: "update_order_status",

      payload: {
        orderId: order.isLocal ? null : order._id,

        orderOperationId:
          order.operationId ||
          order.clientOperationId ||
          null,

        status,
      },

      clientCreatedAt: new Date().toISOString(),
    };

    // أوردر محلي لم يصل للسيرفر بعد
    if (order.isLocal) {
      try {
        await dispatch(enqueueOperation(operation)).unwrap();

        return {
          order: {
            ...order,
            status,
            updatedAt: new Date().toISOString(),
            pendingStatusSync: true,
          },
          queued: true,
        };
      } catch (error) {
        return rejectWithValue(error);
      }
    }

    // أوردر موجود على السيرفر
    try {
      const updatedOrder = await kitchenApi.setKitchenStatus(
        order._id,
        status
      );

      return {
        order: updatedOrder,
        queued: false,
      };
    } catch (error) {
      if (!isUnreachable(error)) {
        return rejectWithValue(
          errMsg(error, "Failed to update order status")
        );
      }

      try {
        await dispatch(enqueueOperation(operation)).unwrap();

        return {
          order: {
            ...order,
            status,
            updatedAt: new Date().toISOString(),
            pendingStatusSync: true,
          },
          queued: true,
        };
      } catch (queueError) {
        return rejectWithValue(queueError);
      }
    }
  }
);

const kitchenSlice = createSlice({
  name: "kitchen",

  initialState: {
    orders: [],
    loading: false,
    error: null,
  },

  reducers: {
    kitchenOrderUpserted: (state, action) => {
      const order = action.payload;

      const index = state.orders.findIndex(
        (item) => item._id === order._id
      );

      if (ACTIVE.includes(order.status)) {
        if (index >= 0) {
          state.orders[index] = order;
        } else {
          state.orders.push(order);
        }

        state.orders.sort(
          (a, b) =>
            new Date(a.createdAt) - new Date(b.createdAt)
        );
      } else if (index >= 0) {
        state.orders.splice(index, 1);
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchKitchenOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchKitchenOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })

      .addCase(fetchKitchenOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(moveKitchenOrder.fulfilled, (state, action) => {
        const { order } = action.payload;

        const index = state.orders.findIndex(
          (item) => item._id === order._id
        );

        if (ACTIVE.includes(order.status)) {
          if (index >= 0) {
            state.orders[index] = order;
          }
        } else if (index >= 0) {
          state.orders.splice(index, 1);
        }
      });
  },
});

export const { kitchenOrderUpserted } = kitchenSlice.actions;

export default kitchenSlice.reducer;
