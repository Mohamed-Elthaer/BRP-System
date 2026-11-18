import { createSlice } from "@reduxjs/toolkit";
import { makeThunk } from "../helpers.js";
import * as settingsApi from "../../Api/settingsApi.js";

export const fetchSettings = makeThunk("settings/fetch", settingsApi.getSettings, "Failed to load settings");
export const saveSettings = makeThunk("settings/save", settingsApi.updateSettings, "Failed to save settings");
export const uploadLogo = makeThunk("settings/logo", settingsApi.updateLogo, "Failed to upload logo");
export const fetchRoles = makeThunk("settings/roles", settingsApi.getRoles, "Failed to load roles");

const cached = () => {
  try { return JSON.parse(localStorage.getItem("cache:settings") || "null"); } catch { return null; }
};
const store = (data) => { try { localStorage.setItem("cache:settings", JSON.stringify(data)); } catch {} };

const settingsSlice = createSlice({
  name: "settings",
  initialState: { data: cached(), roles: null, loading: false, saving: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchSettings.pending, (s) => { s.loading = true; })
      .addCase(fetchSettings.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; store(a.payload); })
      .addCase(fetchSettings.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(saveSettings.pending, (s) => { s.saving = true; })
      .addCase(saveSettings.fulfilled, (s, a) => { s.saving = false; s.data = a.payload; store(a.payload); })
      .addCase(saveSettings.rejected, (s) => { s.saving = false; })
      .addCase(uploadLogo.fulfilled, (s, a) => { s.data = a.payload; store(a.payload); })
      .addCase(fetchRoles.fulfilled, (s, a) => { s.roles = a.payload; });
  },
});

export default settingsSlice.reducer;
