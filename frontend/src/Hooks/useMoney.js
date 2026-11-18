import { useCallback } from "react";
import { useSelector } from "react-redux";
import { money } from "../Utils/format.js";

// بيرجّع دالة تنسيق المبالغ بعملة المطعم من الإعدادات
export default function useMoney() {
  const currency = useSelector((s) => s.settings.data?.currency || "EGP");
  return useCallback((n) => money(n, currency), [currency]);
}
