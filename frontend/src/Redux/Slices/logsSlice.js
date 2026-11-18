import * as logApi from "../../Api/logApi.js";
import { createPagedSlice } from "../pagedSliceFactory.js";

const paged = createPagedSlice({ name: "logs", fetcher: logApi.getLogs, key: "logs", label: "activity logs" });
export const fetchLogs = paged.fetchPage;
export default paged.reducer;
