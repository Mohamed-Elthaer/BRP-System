import * as api from "../../Api/menuApi.js";
import { createCrudSlice } from "../crudSliceFactory.js";
import { makeThunk } from "../helpers.js";

const crud = createCrudSlice({
  name: "menu",
  api,
  label: "menu item",
  persistKey: "cache:menu", // الـ POS بيشتغل من النسخة المحفوظة لو الإنترنت قطع
  reducers: {
    // تحديث لحظي من socket (menu:updated)
    menuItemPatched: (s, a) => {
      const item = s.items.find((i) => i._id === a.payload._id);
      if (item) Object.assign(item, a.payload);
    },
  },
});

export const { menuItemPatched } = crud.actions;
export const { fetchAll: fetchMenu, createOne: createMenuItem, updateOne: updateMenuItem, removeOne: deleteMenuItem } = crud.thunks;
export const toggleAvailability = makeThunk("menu/availability", ({ id, isAvailable }) => api.setAvailability(id, isAvailable), "Failed to update availability");
export default crud.reducer;
