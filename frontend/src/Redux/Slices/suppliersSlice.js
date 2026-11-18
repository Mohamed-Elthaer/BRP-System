import * as api from "../../Api/supplierApi.js";
import { createCrudSlice } from "../crudSliceFactory.js";

const crud = createCrudSlice({ name: "supplier", api, label: "supplier" });

export const { fetchAll: fetchSuppliers, createOne: createSupplier, updateOne: updateSupplier, removeOne: deleteSupplier } = crud.thunks;
export default crud.reducer;
