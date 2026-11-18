import * as paymentApi from "../../Api/paymentApi.js";
import { createPagedSlice } from "../pagedSliceFactory.js";

const paged = createPagedSlice({ name: "payments", fetcher: paymentApi.getPayments, key: "payments", label: "payments" });
export const fetchPayments = paged.fetchPage;
export default paged.reducer;
