import { createSlice } from "@reduxjs/toolkit";

const initialTheme = () => {
  try {
    const t = localStorage.getItem("theme");
    if (t) return t;
  } catch {}
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const uiSlice = createSlice({
  name: "ui",
  initialState: { theme: initialTheme(), sidebarOpen: false },
  reducers: {
    toggleTheme: (s) => { s.theme = s.theme === "dark" ? "light" : "dark"; },
    setSidebar: (s, a) => { s.sidebarOpen = a.payload; },
  },
});

export const { toggleTheme, setSidebar } = uiSlice.actions;
export default uiSlice.reducer;
