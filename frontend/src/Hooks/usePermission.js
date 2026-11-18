import { useSelector } from "react-redux";

// can("orders.view", "pos.use") = المستخدم عنده واحدة منهم على الأقل (زي requirePermission في الباك)
export default function usePermission() {
  const { user, permissions } = useSelector((s) => s.auth);
  const can = (...perms) => perms.some((p) => permissions.includes(p));
  return { can, user, role: user?.role, permissions };
}
