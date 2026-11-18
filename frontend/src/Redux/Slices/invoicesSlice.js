import * as invoiceApi from "../../Api/invoiceApi.js";
import { createPagedSlice } from "../pagedSliceFactory.js";

const paged = createPagedSlice({ name: "invoices", fetcher: invoiceApi.getInvoices, key: "invoices", label: "invoices" });
export const fetchInvoices = paged.fetchPage;
export default paged.reducer;
