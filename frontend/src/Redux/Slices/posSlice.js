import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { errMsg } from "../helpers.js";
import * as orderApi from "../../Api/orderApi.js";
import { enqueueOperation } from "./syncSlice.js";
import { uuid } from "../../Utils/format.js";

const emptyFields = { tableNumber: "", customerName: "", customerPhone: "", deliveryAddress: "", notes: "" };

/*
 * إرسال أوردر من الـ POS:
 *  - أونلاين: POST /orders بـ clientOperationId (الباك idempotent)
 *  - مفيش شبكة: بيتخزن في طابور IndexedDB بنفس الـ id ويتبعت لوحده بعدين
 *  payload.payment موجود = Pay & Complete، مش موجود = Send to Kitchen
 */
// export const submitOrder = createAsyncThunk("pos/submit", async (payload, { dispatch, rejectWithValue }) => {
//   const clientOperationId = uuid();
//   try {
//     const data = await orderApi.createOrder({ ...payload, clientOperationId });
//     return { queued: false, order: data.order, invoice: data.invoice };
//   } catch (e) {
//     if (!e.response) {
//       await dispatch(
//         enqueueOperation({ operationId: clientOperationId, type: "create_order", payload, clientCreatedAt: new Date().toISOString() }),
//       ).unwrap();
//       return { queued: true, order: null, invoice: null };
//     }
//     return rejectWithValue(errMsg(e, "Failed to place order"));
//   }
// });

export const submitOrder = createAsyncThunk(
  "pos/submit",
  async (payload, { dispatch, rejectWithValue }) => {
    const clientOperationId = uuid();

    try {
      const data = await orderApi.createOrder({
        ...payload,
        clientOperationId,
      });

      return {
        queued: false,
        order: data.order,
        invoice: data.invoice,
      };
    } catch (error) {
      if (isUnreachable(error)) {
        try {
          await dispatch(
            enqueueOperation({
              operationId: clientOperationId,
              type: "create_order",

              payload: {
                ...payload,
                clientOperationId,
              },

              clientCreatedAt: new Date().toISOString(),
            })
          ).unwrap();

          return {
            queued: true,
            order: null,
            invoice: null,
            operationId: clientOperationId,
          };
        } catch (queueError) {
          return rejectWithValue(
            errMsg(queueError, "Failed to save order locally")
          );
        }
      }

      return rejectWithValue(
        errMsg(error, "Failed to place order")
      );
    }
  }
);
const posSlice = createSlice({
  name: "pos",
  initialState: {
    items: [], orderType: "dine_in", fields: { ...emptyFields }, discount: { type: "percent", value: "" },
    submitting: false, error: null,
  },
  reducers: {
    addItem: (s, a) => {
      const m = a.payload;
      const found = s.items.find((i) => i.menuItem === m._id);
      if (found) found.quantity = Math.min(found.quantity + 1, 100);
      else s.items.push({ menuItem: m._id, name: m.name, price: m.price, quantity: 1, notes: "" });
    },
    setQty: (s, a) => {
      const { id, quantity } = a.payload;
      if (quantity <= 0) s.items = s.items.filter((i) => i.menuItem !== id);
      else { const it = s.items.find((i) => i.menuItem === id); if (it) it.quantity = Math.min(quantity, 100); }
    },
    setItemNotes: (s, a) => { const it = s.items.find((i) => i.menuItem === a.payload.id); if (it) it.notes = a.payload.notes; },
    removeItem: (s, a) => { s.items = s.items.filter((i) => i.menuItem !== a.payload); },
    setOrderType: (s, a) => { s.orderType = a.payload; },
    setField: (s, a) => { s.fields[a.payload.name] = a.payload.value; },
    setDiscount: (s, a) => { s.discount = { ...s.discount, ...a.payload }; },
    clearCart: (s) => { s.items = []; s.fields = { ...emptyFields }; s.discount = { type: "percent", value: "" }; },
  },
  extraReducers: (b) => {
    b.addCase(submitOrder.pending, (s) => { s.submitting = true; s.error = null; })
      .addCase(submitOrder.fulfilled, (s) => { s.submitting = false; })
      .addCase(submitOrder.rejected, (s, a) => { s.submitting = false; s.error = a.payload; });
  },
});

export const { addItem, setQty, setItemNotes, removeItem, setOrderType, setField, setDiscount, clearCart } = posSlice.actions;
export default posSlice.reducer;
