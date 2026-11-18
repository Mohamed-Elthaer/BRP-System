// import { createAsyncThunk } from "@reduxjs/toolkit";

// // رسالة الخطأ من الباك، أو رسالة شبكة لو مفيش response
// export const errMsg = (e, fallback) =>
//   e?.response?.data?.message || (e?.response ? fallback : "Network error. Check your connection");

// // createAsyncThunk بنفس نمط rejectWithValue بس من غير تكرار try/catch
// export const makeThunk = (type, fn, fallback) =>
//   createAsyncThunk(type, async (arg, { rejectWithValue }) => {
//     try {
//       return await fn(arg);
//     } catch (e) {
//       return rejectWithValue(errMsg(e, fallback));
//     }
//   });


import { createAsyncThunk } from "@reduxjs/toolkit";

// رسالة الخطأ من الباك، أو رسالة شبكة لو مفيش response
export const errMsg = (e, fallback) =>
  e?.response?.data?.message || (e?.response ? fallback : "Network error. Check your connection");

// السيرفر أو الداتابيز مش متاحين (مفيش رد، timeout، أو 502/503/504) = نتعامل معاها كأوفلاين
export const isUnreachable = (e) => !e?.response || [502, 503, 504].includes(e.response.status);

// createAsyncThunk بنفس نمط rejectWithValue بس من غير تكرار try/catch
export const makeThunk = (type, fn, fallback) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (e) {
      return rejectWithValue(errMsg(e, fallback));
    }
  });