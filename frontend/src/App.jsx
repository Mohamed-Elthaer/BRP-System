import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MainLayout from "./Components/layout/MainLayout.jsx";
import ProtectedRoute from "./Components/layout/ProtectedRoute.jsx";
import { fetchMyProfile, sessionExpired } from "./Redux/Slices/authSlice.js";
import { PERM, ROLE_META } from "./Utils/constants.js";
import Login from "./Pages/Login.jsx";
import Setup from "./Pages/Setup.jsx";
import Dashboard from "./Pages/Dashboard.jsx";
import POS from "./Pages/POS.jsx";
import Orders from "./Pages/Orders.jsx";
import OrderDetails from "./Pages/OrderDetails.jsx";
import Kitchen from "./Pages/Kitchen.jsx";
import MenuItems from "./Pages/MenuItems.jsx";
import Categories from "./Pages/Categories.jsx";
import Recipes from "./Pages/Recipes.jsx";
import Inventory from "./Pages/Inventory.jsx";
import Ingredients from "./Pages/Ingredients.jsx";
import Suppliers from "./Pages/Suppliers.jsx";
import Expenses from "./Pages/Expenses.jsx";
import Invoices from "./Pages/Invoices.jsx";
import Payments from "./Pages/Payments.jsx";
import Employees from "./Pages/Employees.jsx";
import ActivityLogs from "./Pages/ActivityLogs.jsx";
import Sync from "./Pages/Sync.jsx";
import Settings from "./Pages/Settings.jsx";
import Profile from "./Pages/Profile.jsx";
import NotFound from "./Pages/NotFound.jsx";
import { loadQueue } from "./Redux/Slices/syncSlice.js";

// كل مستخدم بيدخل على صفحته الرئيسية حسب الدور
function HomeRedirect() {
  const role = useSelector((s) => s.auth.user?.role);
  return <Navigate to={ROLE_META[role]?.home || "/profile"} replace />;
}

const guard = (perm, el) => <ProtectedRoute perm={perm}>{el}</ProtectedRoute>;

export default function App() {
  const dispatch = useDispatch();
  const theme = useSelector((s) => s.ui.theme);

  useEffect(() => { dispatch(fetchMyProfile()); }, [dispatch]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  useEffect(() => {
    const onExpired = () => { dispatch(sessionExpired()); toast.warn("Session expired. Please sign in again."); };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, [dispatch]);

  useEffect(() => {
  dispatch(loadQueue());
}, [dispatch]);
  return (
    <>
      <ToastContainer position="top-right" theme={theme} autoClose={3500} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<Setup />} />

        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<HomeRedirect />} />
          <Route path="dashboard" element={guard([PERM.DASHBOARD_VIEW], <Dashboard />)} />
          <Route path="pos" element={guard([PERM.POS_USE], <POS />)} />
          <Route path="orders" element={guard([PERM.ORDERS_VIEW], <Orders />)} />
          <Route path="orders/:id" element={guard([PERM.ORDERS_VIEW], <OrderDetails />)} />
          <Route path="kitchen" element={guard([PERM.KITCHEN_VIEW], <Kitchen />)} />
          <Route path="menu" element={guard([PERM.MENU_MANAGE], <MenuItems />)} />
          <Route path="categories" element={guard([PERM.MENU_MANAGE], <Categories />)} />
          <Route path="recipes" element={guard([PERM.MENU_MANAGE], <Recipes />)} />
          <Route path="inventory" element={guard([PERM.INVENTORY_VIEW], <Inventory />)} />
          <Route path="ingredients" element={guard([PERM.INVENTORY_VIEW], <Ingredients />)} />
          <Route path="suppliers" element={guard([PERM.INVENTORY_VIEW], <Suppliers />)} />
          <Route path="expenses" element={guard([PERM.EXPENSES_MANAGE], <Expenses />)} />
          <Route path="invoices" element={guard([PERM.ORDERS_VIEW], <Invoices />)} />
          <Route path="payments" element={guard([PERM.ORDERS_VIEW], <Payments />)} />
          <Route path="employees" element={guard([PERM.EMPLOYEES_MANAGE], <Employees />)} />
          <Route path="activity" element={guard([PERM.LOGS_VIEW], <ActivityLogs />)} />
          <Route path="sync" element={guard([PERM.POS_USE], <Sync />)} />
          <Route path="settings" element={guard([PERM.SETTINGS_MANAGE], <Settings />)} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
