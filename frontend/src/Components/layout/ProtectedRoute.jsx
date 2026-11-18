import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import usePermission from "../../Hooks/usePermission.js";
import { Spinner } from "../ui/Display.jsx";
import Forbidden from "../../Pages/Forbidden.jsx";

// perm: مصفوفة صلاحيات (واحدة منها كفاية) | من غير perm = تسجيل دخول بس
export default function ProtectedRoute({ perm, children }) {
  const { initializing } = useSelector((s) => s.auth);
  const { user, can } = usePermission();
  const location = useLocation();

  if (initializing) {
    return <div className="grid h-dvh place-items-center bg-bg"><Spinner className="size-9" /></div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (perm && !can(...perm)) return <Forbidden />;
  return children;
}
