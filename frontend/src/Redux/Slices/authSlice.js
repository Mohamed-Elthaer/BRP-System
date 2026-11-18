// import { createSlice } from "@reduxjs/toolkit";
// import { makeThunk } from "../helpers.js";
// import * as authApi from "../../Api/authApi.js";
// import * as usersApi from "../../Api/usersApi.js";

// export const fetchMyProfile = makeThunk("auth/fetchMyProfile", authApi.getMyProfileUser, "Not authenticated");
// export const loginUser = makeThunk("auth/login", authApi.loginUser, "Login failed");
// export const setupOwner = makeThunk("auth/setupOwner", authApi.setupOwner, "Setup failed");
// export const logoutUser = makeThunk("auth/logout", authApi.logoutUser, "Logout failed");
// export const updateProfile = makeThunk("auth/updateProfile", usersApi.updateMyprofileUser, "Failed to update profile");
// export const changePassword = makeThunk("auth/changePassword", authApi.changeMyPassword, "Failed to change password");

// const initialState = {
//   user: null,
//   permissions: [], // بترجع من الباك مع login و /me
//   initializing: true, // أول تحميل للجلسة
//   loading: false,
//   error: null,
// };

// const signedIn = (state, action) => {
//   state.loading = false;
//   state.user = action.payload.user;
//   state.permissions = action.payload.permissions;
// };
// const signedOut = (state) => {
//   state.loading = false;
//   state.user = null;
//   state.permissions = [];
// };

// const authSlice = createSlice({
//   name: "auth",
//   initialState,
//   reducers: { sessionExpired: signedOut },
//   extraReducers: (b) => {
//     b.addCase(fetchMyProfile.fulfilled, (s, a) => { signedIn(s, a); s.initializing = false; })
//       .addCase(fetchMyProfile.rejected, (s) => { signedOut(s); s.initializing = false; })

//       .addCase(loginUser.pending, (s) => { s.loading = true; s.error = null; })
//       .addCase(loginUser.fulfilled, signedIn)
//       .addCase(loginUser.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

//       .addCase(setupOwner.pending, (s) => { s.loading = true; s.error = null; })
//       .addCase(setupOwner.fulfilled, signedIn)
//       .addCase(setupOwner.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

//       .addCase(logoutUser.fulfilled, signedOut)
//       .addCase(logoutUser.rejected, signedOut)

//       .addCase(updateProfile.fulfilled, (s, a) => { s.user = a.payload; });
//   },
// });

// export const { sessionExpired } = authSlice.actions;
// export default authSlice.reducer;


import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { errMsg, isUnreachable, makeThunk } from "../helpers.js";
import * as authApi from "../../Api/authApi.js";
import * as usersApi from "../../Api/usersApi.js";

// نسخة من الجلسة للعرض فقط. السيرفر هو اللي بيفرض الصلاحيات في كل طلب
const SESSION_KEY = "cache:session";
const readSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } };
const writeSession = (v) => { try { v ? localStorage.setItem(SESSION_KEY, JSON.stringify(v)) : localStorage.removeItem(SESSION_KEY); } catch {} };

// لو السيرفر/النت واقعين بنكمّل بالجلسة المحفوظة بدل ما نرمي المستخدم لصفحة الدخول
export const fetchMyProfile = createAsyncThunk("auth/fetchMyProfile", async (_, { rejectWithValue }) => {
  try {
    return await authApi.getMyProfileUser();
  } catch (e) {
    const cached = readSession();
    if (isUnreachable(e) && cached) return cached;
    return rejectWithValue(errMsg(e, "Not authenticated"));
  }
});
export const loginUser = makeThunk("auth/login", authApi.loginUser, "Login failed");
export const setupOwner = makeThunk("auth/setupOwner", authApi.setupOwner, "Setup failed");
export const logoutUser = makeThunk("auth/logout", authApi.logoutUser, "Logout failed");
export const updateProfile = makeThunk("auth/updateProfile", usersApi.updateMyprofileUser, "Failed to update profile");
export const changePassword = makeThunk("auth/changePassword", authApi.changeMyPassword, "Failed to change password");

const initialState = {
  user: null,
  permissions: [], // بترجع من الباك مع login و /me
  initializing: true, // أول تحميل للجلسة
  loading: false,
  error: null,
};

const signedIn = (state, action) => {
  state.loading = false;
  state.user = action.payload.user;
  state.permissions = action.payload.permissions;
  writeSession({ user: state.user, permissions: state.permissions });
};
const signedOut = (state) => {
  state.loading = false;
  state.user = null;
  state.permissions = [];
  writeSession(null);
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: { sessionExpired: signedOut },
  extraReducers: (b) => {
    b.addCase(fetchMyProfile.fulfilled, (s, a) => { signedIn(s, a); s.initializing = false; })
      .addCase(fetchMyProfile.rejected, (s) => { signedOut(s); s.initializing = false; })

      .addCase(loginUser.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(loginUser.fulfilled, signedIn)
      .addCase(loginUser.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(setupOwner.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(setupOwner.fulfilled, signedIn)
      .addCase(setupOwner.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(logoutUser.fulfilled, signedOut)
      .addCase(logoutUser.rejected, signedOut)

      .addCase(updateProfile.fulfilled, (s, a) => { s.user = a.payload; writeSession({ user: s.user, permissions: s.permissions }); });
  },
});

export const { sessionExpired } = authSlice.actions;
export default authSlice.reducer;